// Business logic for building the World Cup 2026 knockout bracket from the
// football-data.org feed. Extracted verbatim from scripts/fetch-data.js so the
// persistent server (server.js) and the manual CLI (scripts/fetch-data.js) share
// exactly the same behaviour instead of duplicating it. Do NOT change the shape
// of the objects produced here: index.html depends on it.
const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const TEAM_STRENGTH_PATH = path.join(__dirname, "..", "data", "team-strength.json");

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

const TEAM_CODE_ALIASES = {
  ALG: "DZA",
};

const TEAM_STRENGTH = JSON.parse(fs.readFileSync(TEAM_STRENGTH_PATH, "utf8"));
const PROBABILITY_WEIGHTS = TEAM_STRENGTH.model.weights;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function strengthRating(team) {
  if (!team || !team.code) return null;
  const data = TEAM_STRENGTH.teams[team.code];
  if (!data) return null;

  const elo = data.elo || 1700;
  const fifaRating = data.fifaRank ? 2200 - (data.fifaRank - 1) * 12 : elo;
  const formRating = data.recentForm != null ? 1700 + (data.recentForm - 0.5) * 500 : elo;

  return (
    PROBABILITY_WEIGHTS.elo * elo +
    PROBABILITY_WEIGHTS.fifaRank * fifaRating +
    PROBABILITY_WEIGHTS.recentForm * formRating
  );
}

function qualificationProbabilities(match) {
  if (!match.home || !match.away || match.status === "final") return null;

  const homeRating = strengthRating(match.home);
  const awayRating = strengthRating(match.away);
  if (homeRating == null || awayRating == null) return null;

  const rawHome = 1 / (1 + Math.pow(10, (awayRating - homeRating) / 400));
  const home = clamp(Math.round(rawHome * 100), 5, 95);
  return { home, away: 100 - home };
}

function withProbabilities(match) {
  const probabilities = qualificationProbabilities(match);
  if (!probabilities) {
    const { probabilities: _probabilities, ...withoutProbabilities } = match;
    return withoutProbabilities;
  }
  return { ...match, probabilities };
}

// Statuses football-data.org can report while a knockout match is under way,
// including breaks in play that are still part of the same live match:
// half-time/other stoppages (PAUSED, SUSPENDED), extra time (EXTRA_TIME) and
// a penalty shootout (PENALTY_SHOOTOUT). Any of these must map to "live" —
// otherwise the match would briefly look "scheduled" (losing its live badge,
// minute counter and pause tracking) every time it enters extra time or
// penalties, and could even re-trigger a spurious "kickoff" event/push
// notification once it flips back.
const LIVE_API_STATUSES = ["IN_PLAY", "LIVE", "PAUSED", "SUSPENDED", "EXTRA_TIME", "PENALTY_SHOOTOUT"];

function mapStatus(apiStatus) {
  if (apiStatus === "FINISHED" || apiStatus === "AWARDED") return "final";
  if (LIVE_API_STATUSES.includes(apiStatus)) return "live";
  return "scheduled";
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function teamCode(t) {
  if (!t) return null;
  const code = t.tla || (t.shortName || t.name || "").slice(0, 3).toUpperCase();
  return TEAM_CODE_ALIASES[code] || code;
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
      live: null,
      winner: null,
      date: MATCH_DATES[matchNum] || null,
    };
  }
  return { home: null, away: null, score: { home: null, away: null }, penalties: null, status: "scheduled", live: null, winner: null, date: MATCH_DATES[matchNum] || null };
}

function liveDetails(mt, status) {
  if (status !== "live") return null;
  return {
    apiStatus: mt.status || null,
    duration: mt.score && mt.score.duration ? mt.score.duration : null,
    minute: numberOrNull(mt.minute),
    injuryTime: numberOrNull(mt.injuryTime),
  };
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
    live: liveDetails(mt, status),
    winner,
    date: mt.utcDate || MATCH_DATES[matchNum] || null,
  };
}

function teamObject(apiTeam) {
  const code = teamCode(apiTeam);
  if(!code) return null;
  return { code, name: apiTeam.shortName || apiTeam.name || CODE_TO_NAME[code] || code };
}

function groupStageEntry(match, teamSide) {
  if (!match.score || !match.score.fullTime) return null;
  const isHome = teamSide === "home";
  const teamScore = isHome ? match.score.fullTime.home : match.score.fullTime.away;
  const opponentScore = isHome ? match.score.fullTime.away : match.score.fullTime.home;
  if(teamScore == null || opponentScore == null) return null;
  return {
    opponent: teamObject(isHome ? match.awayTeam : match.homeTeam),
    teamScore,
    opponentScore,
    result: teamScore === opponentScore ? "D" : (teamScore > opponentScore ? "W" : "L"),
    date: match.utcDate || null,
  };
}

function buildGroupStageByTeam(allMatches) {
  const byTeam = {};
  allMatches.forEach((mt) => {
    const stage = (mt.stage || "").toUpperCase();
    if(!stage.includes("GROUP") || mt.status !== "FINISHED") return;

    const home = teamObject(mt.homeTeam);
    const away = teamObject(mt.awayTeam);
    if(!home || !away) return;

    const homeEntry = groupStageEntry(mt, "home");
    const awayEntry = groupStageEntry(mt, "away");
    if(homeEntry) {
      if(!byTeam[home.code]) byTeam[home.code] = [];
      byTeam[home.code].push(homeEntry);
    }
    if(awayEntry) {
      if(!byTeam[away.code]) byTeam[away.code] = [];
      byTeam[away.code].push(awayEntry);
    }
  });

  Object.values(byTeam).forEach((matches) => {
    matches.sort((a, b) => {
      const timeA = a.date ? Date.parse(a.date) : 0;
      const timeB = b.date ? Date.parse(b.date) : 0;
      return timeA - timeB;
    });
  });

  return byTeam;
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
      match = withProbabilities(match);
      matchResults[num] = match;
      return match;
    });
  });
  return rounds;
}

// Single source of truth for the whole fetch flow, shared by server.js (every
// 2 min) and scripts/fetch-data.js (one-shot CLI).
//
// The server self-hosts the polling (every 2 min = well under the 10 req/min
// limit), so it simply fetches the current state on every cycle — match in
// progress or not. There is no longer any window-based skipping.
//
//  - On 429 or any transient API error, returns null (keep previous data)
//    instead of throwing, so the persistent server never crashes on a blip.
//
// Returns `{ updated, rounds }` on success, or `null` when the API call fails.
async function fetchAndBuildBracket({ apiKey } = {}) {
  if (!apiKey) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY");
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/competitions/${COMPETITION}/matches`, {
      headers: { "X-Auth-Token": apiKey },
    });
  } catch (err) {
    console.error("football-data.org request failed:", err.message);
    return null;
  }

  if (res.status === 429) {
    console.warn("Rate limited by football-data.org — keeping previous bracket untouched.");
    return null;
  }
  if (!res.ok) {
    console.error("football-data.org error:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  const matches = data.matches || [];
  const rounds = buildRounds(matches);
  const groupStage = buildGroupStageByTeam(matches);
  return { updated: new Date().toISOString(), rounds, groupStage };
}

module.exports = {
  API_BASE,
  COMPETITION,
  MATCH_TEAMS,
  MATCH_CHILDREN,
  ROUND_MATCH_NUMBERS,
  MATCH_DATES,
  CODE_TO_NAME,
  TEAM_CODE_ALIASES,
  mapStatus,
  teamCode,
  poolOf,
  findApiMatch,
  placeholderMatch,
  toMatchObject,
  buildRounds,
  buildGroupStageByTeam,
  fetchAndBuildBracket,
};
