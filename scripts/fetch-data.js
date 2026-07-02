// Runs server-side (GitHub Actions). Node 20+ has global fetch, no deps needed.
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "bracket.json");

// ---------------------------------------------------------------------------
// FIXED FIFA bracket topology (2026 World Cup, 32-team knockout stage).
// This is published by FIFA in advance and does NOT depend on results — only
// the identity of the two teams in each Round of 32 tie is fixed by the group
// stage outcome; every match above that is defined purely by match number
// ("Match 89 = Winner Match 74 v Winner Match 77", etc). Hardcoding this is
// what lets the bracket be positioned correctly even before later rounds are
// played, instead of guessing from chronological order (which was the bug).
// Source: FIFA's official knockout schedule. Third-place match (103) is
// intentionally excluded, as requested.
// ---------------------------------------------------------------------------
const MATCH_TEAMS = {
  73: ["RSA", "CAN"], 74: ["GER", "PAR"], 75: ["NED", "MAR"], 76: ["BRA", "JPN"],
  77: ["FRA", "SWE"], 78: ["CIV", "NOR"], 79: ["MEX", "ECU"], 80: ["ENG", "COD"],
  81: ["USA", "BIH"], 82: ["BEL", "SEN"], 83: ["POR", "CRO"], 84: ["ESP", "AUT"],
  85: ["SUI", "DZA"], 86: ["ARG", "CPV"], 87: ["COL", "GHA"], 88: ["AUS", "EGY"],
};

const MATCH_CHILDREN = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  104: [101, 102],
};

// Canonical left-to-right order per round, derived by walking the tree above
// depth-first from the Final down to the Round of 32 leaves.
const ROUND_MATCH_NUMBERS = {
  LAST_32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  LAST_16: [89, 90, 93, 94, 91, 92, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
};

// Kickoff dates/times are also fixed by FIFA in advance, independent of which
// teams end up playing (source: official schedule, converted to UTC). Used
// as a fallback so every slot shows a real date even before its teams are
// known — the API's own utcDate is still preferred when available.
const MATCH_DATES = {
  73: "2026-06-28T19:00:00Z", 76: "2026-06-29T17:00:00Z", 74: "2026-06-29T20:30:00Z",
  75: "2026-06-30T01:00:00Z", 78: "2026-06-30T17:00:00Z", 77: "2026-06-30T21:00:00Z",
  79: "2026-07-01T01:00:00Z", 80: "2026-07-01T16:00:00Z", 82: "2026-07-01T20:00:00Z",
  81: "2026-07-02T00:00:00Z", 84: "2026-07-02T19:00:00Z",
  83: "2026-07-02T23:00:00Z", 85: "2026-07-03T03:00:00Z", 88: "2026-07-03T18:00:00Z", 86: "2026-07-03T22:00:00Z",
  87: "2026-07-04T01:30:00Z",
  90: "2026-07-04T17:00:00Z", 89: "2026-07-04T21:00:00Z",
  91: "2026-07-05T20:00:00Z",
  92: "2026-07-06T00:00:00Z", 93: "2026-07-06T19:00:00Z",
  94: "2026-07-07T00:00:00Z", 95: "2026-07-07T16:00:00Z", 96: "2026-07-07T20:00:00Z",
  97: "2026-07-09T20:00:00Z",
  98: "2026-07-10T19:00:00Z",
  99: "2026-07-11T21:00:00Z",
  100: "2026-07-12T01:00:00Z",
  101: "2026-07-14T19:00:00Z",
  102: "2026-07-15T19:00:00Z",
  104: "2026-07-19T19:00:00Z",
};

const CODE_TO_NAME = {
  MEX: "Mexique", RSA: "Afrique du Sud", KOR: "Corée du Sud", CZE: "Tchéquie",
  SUI: "Suisse", CAN: "Canada", BIH: "Bosnie-Herzégovine", QAT: "Qatar",
  BRA: "Brésil", MAR: "Maroc", SCO: "Écosse", HTI: "Haïti",
  USA: "États-Unis", AUS: "Australie", PAR: "Paraguay", TUR: "Türkiye",
  GER: "Allemagne", CIV: "Côte d'Ivoire", ECU: "Équateur", CUW: "Curaçao",
  NED: "Pays-Bas", JPN: "Japon", SWE: "Suède", TUN: "Tunisie",
  BEL: "Belgique", EGY: "Égypte", IRN: "Iran", NZL: "Nouvelle-Zélande",
  ESP: "Espagne", CPV: "Cap-Vert", URU: "Uruguay", KSA: "Arabie Saoudite",
  FRA: "France", NOR: "Norvège", SEN: "Sénégal", IRQ: "Irak",
  ARG: "Argentine", AUT: "Autriche", DZA: "Algérie", JOR: "Jordanie",
  COL: "Colombie", POR: "Portugal", COD: "RD Congo", UZB: "Ouzbékistan",
  ENG: "Angleterre", CRO: "Croatie", GHA: "Ghana", PAN: "Panama",
};

function mapStatus(apiStatus) {
  if (apiStatus === "FINISHED" || apiStatus === "AWARDED") return "final";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(apiStatus)) return "live";
  return "scheduled";
}

function teamCode(t) {
  if (!t) return null;
  return t.tla || (t.shortName || t.name || "").slice(0, 3).toUpperCase();
}

const poolCache = {};
function poolOf(matchNum) {
  if (poolCache[matchNum]) return poolCache[matchNum];
  const pool = MATCH_TEAMS[matchNum]
    ? new Set(MATCH_TEAMS[matchNum])
    : new Set([...poolOf(MATCH_CHILDREN[matchNum][0]), ...poolOf(MATCH_CHILDREN[matchNum][1])]);
  poolCache[matchNum] = pool;
  return pool;
}

// Finds which API fixture (within a given stage's match list) corresponds to
// a fixed bracket slot, by checking that every team code the fixture already
// knows about belongs to that slot's "pool" of possible teams. Works even
// when only one side is decided yet (the other is still TBD), and sibling
// slots never share pool members so this is unambiguous.
function findApiMatch(apiMatchesForStage, matchNum) {
  const pool = poolOf(matchNum);
  return (
    apiMatchesForStage.find((mt) => {
      const codes = [mt.homeTeam, mt.awayTeam].map(teamCode).filter(Boolean);
      return codes.length > 0 && codes.every((c) => pool.has(c));
    }) || null
  );
}

function placeholderMatch(matchNum) {
  if (MATCH_TEAMS[matchNum]) {
    const [a, b] = MATCH_TEAMS[matchNum];
    return {
      home: { code: a, name: CODE_TO_NAME[a] || a },
      away: { code: b, name: CODE_TO_NAME[b] || b },
      score: { home: null, away: null },
      penalties: null,
      status: "scheduled",
      winner: null,
      date: MATCH_DATES[matchNum] || null,
    };
  }
  return { home: null, away: null, score: { home: null, away: null }, penalties: null, status: "scheduled", winner: null, date: MATCH_DATES[matchNum] || null };
}

function toMatchObject(mt, matchNum) {
  const status = mapStatus(mt.status);
  let winner = null;
  if (status === "final") {
    if (mt.score.winner === "HOME_TEAM") winner = "home";
    else if (mt.score.winner === "AWAY_TEAM") winner = "away";
  }
  const homeCode = teamCode(mt.homeTeam);
  const awayCode = teamCode(mt.awayTeam);
  return {
    home: mt.homeTeam ? { code: homeCode, name: mt.homeTeam.shortName || mt.homeTeam.name || CODE_TO_NAME[homeCode] } : null,
    away: mt.awayTeam ? { code: awayCode, name: mt.awayTeam.shortName || mt.awayTeam.name || CODE_TO_NAME[awayCode] } : null,
    score: { home: mt.score.fullTime.home, away: mt.score.fullTime.away },
    penalties: mt.score.penalties && mt.score.penalties.home != null ? mt.score.penalties : null,
    status,
    winner,
    date: mt.utcDate || MATCH_DATES[matchNum] || null,
  };
}

// Given a completed child match's result, returns the team object that won
// it, or null if that child hasn't been decided yet.
function winnerOf(matchResult) {
  if (!matchResult || !matchResult.winner) return null;
  return matchResult[matchResult.winner] || null;
}

// Fills in a match's home/away teams from the known winners of its child
// matches when the API hasn't published that fixture's teams yet (or hasn't
// created the fixture at all). This is what lets a round of 16+ slot show
// its teams as soon as both feeder matches are final, instead of waiting for
// football-data.org to catch up.
function fillFromChildren(match, matchNum, matchResults) {
  const children = MATCH_CHILDREN[matchNum];
  if (!children) return match;
  const [childA, childB] = children;
  const home = match.home || winnerOf(matchResults[childA]);
  const away = match.away || winnerOf(matchResults[childB]);
  if (home === match.home && away === match.away) return match;
  return { ...match, home, away };
}

function buildRounds(allMatches) {
  const byStage = {};
  allMatches.forEach((mt) => {
    const s = (mt.stage || "").toUpperCase();
    if (!byStage[s]) byStage[s] = [];
    byStage[s].push(mt);
  });

  const matchResults = {};
  const stageOrder = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
  const rounds = stageOrder.map((stageKey) => {
    const apiList = byStage[stageKey] || [];
    return ROUND_MATCH_NUMBERS[stageKey].map((num) => {
      const mt = findApiMatch(apiList, num);
      let match = mt ? toMatchObject(mt, num) : placeholderMatch(num);
      match = fillFromChildren(match, num, matchResults);
      matchResults[num] = match;
      return match;
    });
  });
  return rounds;
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
    return;
  }
  if (!res.ok) {
    console.error("football-data.org error:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const rounds = buildRounds(data.matches || []);
  const output = { updated: new Date().toISOString(), rounds };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${rounds.length} knockout round(s) to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
