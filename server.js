// Persistent World Cup 2026 bracket server.
//
// Replaces the old one-shot GitHub Actions script: instead of committing
// data/bracket.json to the repo, this process polls football-data.org every
// 2 minutes, keeps the latest bracket in memory, and serves it over HTTP at
// the exact same path/shape the front-end already expects (GET /bracket.json
// -> { updated, rounds }).
//
// IMPORTANT — SINGLE INSTANCE ONLY:
// Later phases keep per-connection state (SSE clients) in module memory. This
// process MUST run as a single instance (PM2 `instances: 1`). Do NOT cluster
// it without first moving that shared state to an external pub/sub — otherwise
// each worker would only see its own clients and events would be dropped.
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const { fetchAndBuildBracket } = require("./lib/bracket");
const { detectChanges } = require("./lib/diff");

const PORT = process.env.PORT || 3000;
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || "*";
const FETCH_INTERVAL_MS = 2 * 60 * 1000; // 2 min — respects the 10 req/min rate limit
const SSE_PING_INTERVAL_MS = 25 * 1000; // keep-alive so idle proxies don't drop the stream
const DATA_DIR = path.join(__dirname, "data");
const BRACKET_PATH = path.join(DATA_DIR, "bracket.json");

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
let currentBracket = null; // latest { updated, rounds } served to clients
let lastFetchAt = null; // ISO timestamp of the last successful build

// Connected Server-Sent Events clients (Express `res` objects). This lives in
// module memory, which is exactly why the process MUST stay single-instance
// (see the header comment): a second PM2 worker would hold its own separate
// Set and never see events broadcast by the other.
const sseClients = new Set();

// Load whatever bracket we last persisted, so a restart serves data instantly
// instead of an empty response until the first fetch completes.
function loadPersistedBracket() {
  try {
    if (fs.existsSync(BRACKET_PATH)) {
      currentBracket = JSON.parse(fs.readFileSync(BRACKET_PATH, "utf8"));
      lastFetchAt = currentBracket && currentBracket.updated ? currentBracket.updated : null;
      console.log("Loaded persisted bracket from", BRACKET_PATH);
    }
  } catch (err) {
    console.error("Could not read persisted bracket:", err.message);
  }
}

function persistBracket(bracket) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(BRACKET_PATH, JSON.stringify(bracket, null, 2));
  } catch (err) {
    console.error("Could not write bracket.json:", err.message);
  }
}

// Serialise one SSE event to a single connected client. Named events let the
// front-end subscribe selectively (addEventListener("update", ...)) while still
// receiving the typed kickoff/goal/fulltime events on their own channels.
function writeSseEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Push the freshly built bracket to every connected client: first the precise
// typed events (so the UI can react to a specific match), then always a generic
// `update` carrying the whole bracket (so late/simple listeners can just
// re-render from the full payload).
function broadcast(events, bracket) {
  if (sseClients.size === 0) return;
  for (const res of sseClients) {
    try {
      for (const event of events) {
        writeSseEvent(res, event.type, event);
      }
      writeSseEvent(res, "update", bracket);
    } catch (err) {
      console.error("Failed to write SSE event, dropping client:", err.message);
      sseClients.delete(res);
    }
  }
}

// One polling cycle: fetch + build, and if anything changed, persist it and
// update the in-memory copy. Never throws — a bad cycle just keeps old data.
async function refreshBracket() {
  try {
    const previous = currentBracket;
    const next = await fetchAndBuildBracket({
      apiKey: process.env.FOOTBALL_DATA_API_KEY,
      previousData: currentBracket,
    });
    if (!next) return; // nothing to do (outside window, rate-limited, or error)
    const events = detectChanges(previous, next);
    currentBracket = next;
    lastFetchAt = next.updated;
    persistBracket(next);
    broadcast(events, next);
    console.log(
      `Bracket updated at ${next.updated} (${next.rounds.length} rounds, ${events.length} change event(s))`
    );
  } catch (err) {
    console.error("refreshBracket failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const app = express();
app.use(cors({ origin: PUBLIC_ORIGIN === "*" ? "*" : PUBLIC_ORIGIN }));

// Same contract as the old static file: always 200, same JSON shape, and an
// empty-but-valid bracket rather than an error when we have nothing yet.
app.get("/bracket.json", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Cache-Control", "no-cache, must-revalidate");
  res.json(currentBracket || { updated: null, rounds: [] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", lastFetchAt });
});

// Real-time stream of bracket changes. Clients open this once and keep it open;
// server.js pushes a typed event (kickoff/goal/fulltime) plus a generic
// `update` whenever a new bracket is built. A periodic comment ping keeps the
// connection alive through idle-timeout proxies (e.g. Caddy in front).
app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.flushHeaders();

  // Send the current bracket immediately so a client that connects between
  // fetches renders straight away instead of waiting for the next change.
  writeSseEvent(res, "update", currentBracket || { updated: null, rounds: [] });

  sseClients.add(res);

  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (err) {
      clearInterval(ping);
    }
  }, SSE_PING_INTERVAL_MS);

  req.on("close", () => {
    clearInterval(ping);
    sseClients.delete(res);
  });
});

app.listen(PORT, () => {
  console.log(`world-cup-data server listening on :${PORT}`);
  loadPersistedBracket();
  // Fetch immediately on boot so a PM2 restart doesn't leave us stale for 2 min,
  // then keep polling on the fixed cadence.
  refreshBracket();
  setInterval(refreshBracket, FETCH_INTERVAL_MS);
});
