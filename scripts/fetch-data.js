// Runs server-side (GitHub Actions). Node 20+ has global fetch, no deps needed.
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "bracket.json");
const EXCLUDE_STAGE_HINTS = ["THIRD", "3RD", "BRONZE"];

function mapStatus(apiStatus) {
  if (apiStatus === "FINISHED" || apiStatus === "AWARDED") return "final";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(apiStatus)) return "live";
  return "scheduled";
}

function teamKey(t) {
  return t ? String(t.id || t.tla || t.name || t.shortName) : null;
}

// Groups raw matches by stage and keeps only knockout rounds (power-of-two
// match counts), ordered from biggest (32es) to smallest (Finale).
function groupByStage(matches) {
  const groups = {};
  matches.forEach((mt) => {
    const stage = mt.stage || "UNKNOWN";
    const up = stage.toUpperCase();
    if (up.includes("GROUP")) return;
    if (EXCLUDE_STAGE_HINTS.some((h) => up.includes(h))) return;
    if (!groups[stage]) groups[stage] = [];
    groups[stage].push(mt);
  });
  let groupArr = Object.entries(groups).map(([stage, ms]) => ({ stage, matches: ms }));
  groupArr = groupArr.filter((g) => g.matches.length >= 1 && (g.matches.length & (g.matches.length - 1)) === 0);
  groupArr.sort((a, b) => b.matches.length - a.matches.length);
  return groupArr.map((g) => g.matches);
}

// Orders each round's matches left-to-right so the bracket tree connects
// correctly, by walking backward from the Final: a match's home/away team
// tells us exactly which earlier-round match produced it. Any match whose
// team isn't resolvable yet (future round, teams still TBD) falls back to
// chronological order so the layout stays stable until it's known.
function orderRounds(roundsRaw) {
  const n = roundsRaw.length;
  if (n === 0) return [];
  const ordered = new Array(n);
  ordered[n - 1] = [roundsRaw[n - 1][0]]; // Final: single match, trivially ordered

  for (let k = n - 2; k >= 0; k--) {
    const parent = ordered[k + 1];
    const pool = roundsRaw[k].slice();

    function takeMatchWithTeam(teamRef) {
      if (!teamRef) return null;
      const key = teamKey(teamRef);
      const idx = pool.findIndex((m) => teamKey(m.homeTeam) === key || teamKey(m.awayTeam) === key);
      return idx >= 0 ? pool.splice(idx, 1)[0] : null;
    }

    const pairs = parent.map((p) => [takeMatchWithTeam(p.homeTeam), takeMatchWithTeam(p.awayTeam)]);

    pool.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    let poolIdx = 0;
    const finalOrder = [];
    for (const [left, right] of pairs) {
      finalOrder.push(left || pool[poolIdx++] || null);
      finalOrder.push(right || pool[poolIdx++] || null);
    }
    const cleaned = finalOrder.filter(Boolean);
    ordered[k] = cleaned.length === roundsRaw[k].length
      ? cleaned
      : roundsRaw[k].slice().sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate)); // safety net
  }

  return ordered;
}

function toMatchObject(mt) {
  const status = mapStatus(mt.status);
  let winner = null;
  if (status === "final") {
    if (mt.score.winner === "HOME_TEAM") winner = "home";
    else if (mt.score.winner === "AWAY_TEAM") winner = "away";
  }
  return {
    home: mt.homeTeam
      ? { code: mt.homeTeam.tla || (mt.homeTeam.shortName || "").slice(0, 3).toUpperCase(), name: mt.homeTeam.shortName || mt.homeTeam.name }
      : null,
    away: mt.awayTeam
      ? { code: mt.awayTeam.tla || (mt.awayTeam.shortName || "").slice(0, 3).toUpperCase(), name: mt.awayTeam.shortName || mt.awayTeam.name }
      : null,
    score: { home: mt.score.fullTime.home, away: mt.score.fullTime.away },
    penalties: mt.score.penalties && mt.score.penalties.home != null ? mt.score.penalties : null,
    status,
    winner,
    date: mt.utcDate,
  };
}

async function main() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    console.error("Missing FOOTBALL_DATA_API_KEY env var (set it as a repo secret).");
    process.exit(1);
  }

  const res = await fetch(`${API_BASE}/competitions/${COMPETITION}/matches`, {
    headers: { "X-Auth-Token": key },
  });

  if (res.status === 429) {
    console.warn("Rate limited by football-data.org — keeping previous bracket.json untouched.");
    return; // don't overwrite good data with an error
  }
  if (!res.ok) {
    console.error("football-data.org error:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const roundsRaw = groupByStage(data.matches || []);
  const roundsOrdered = orderRounds(roundsRaw);
  const rounds = roundsOrdered.map((r) => r.map(toMatchObject));
  const output = { updated: new Date().toISOString(), rounds };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${rounds.length} knockout round(s) to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
