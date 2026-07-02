// Manual one-shot CLI: fetch the latest bracket once and write data/bracket.json.
//
// Kept as a convenience/fallback for a quick manual refresh without booting the
// whole persistent server. The real business logic now lives in lib/bracket.js
// (shared with server.js) so there is a single source of truth — this file only
// wires that logic to a single fetch + file write.
//
// Usage: FOOTBALL_DATA_API_KEY=... node scripts/fetch-data.js
const fs = require("fs");
const path = require("path");

const { fetchAndBuildBracket } = require("../lib/bracket");

const OUTPUT_PATH = path.join(__dirname, "..", "data", "bracket.json");

async function main() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    console.error("Missing FOOTBALL_DATA_API_KEY env var.");
    process.exit(1);
  }

  // Pass previousData: null so a manual run always hits the API and produces a
  // file, even outside a match window.
  const output = await fetchAndBuildBracket({ apiKey: key, previousData: null });
  if (!output) {
    console.warn("No bracket produced (API error or rate limited) — leaving existing bracket.json untouched.");
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.rounds.length} knockout round(s) to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
