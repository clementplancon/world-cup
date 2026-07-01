const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";
const DEFAULT_KV_KEY = "bracket.json";

const PRE_KICKOFF_BUFFER_MIN = 10;
const POST_KICKOFF_BUFFER_MIN = 170;

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

const ROUND_MATCH_NUMBERS = {
  LAST_32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  LAST_16: [89, 90, 93, 94, 91, 92, 95, 96],
  QUARTER_FINALS: [97, 98, 99, 100],
  SEMI_FINALS: [101, 102],
  FINAL: [104],
};

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

const poolCache = {};

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      console.error("Request failed:", error);
      return jsonResponse(
        { error: "Worker failure", message: error.message },
        500,
        request,
        env
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncBracket(env, { reason: `Cron trigger ${event.cron || ""}` }).catch((error) => {
        console.error("Scheduled sync failed:", error);
      })
    );
  },
};

async function handleRequest(request, env, ctx) {
  if (!env.BRACKET_KV) {
    throw new Error("Missing BRACKET_KV binding.");
  }

  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405, request, env);
  }

  if (url.pathname === "/bracket.json") {
    const data = await getOrSeedBracket(env, ctx);
    if (!data) {
      return jsonResponse(
        { error: "Bracket data not available yet." },
        503,
        request,
        env
      );
    }
    return jsonResponse(data, 200, request, env);
  }

  if (url.pathname === "/healthz") {
    const data = await readStoredBracket(env);
    return jsonResponse(
      {
        ok: true,
        hasData: Boolean(data),
        updated: data?.updated || null,
      },
      200,
      request,
      env
    );
  }

  return new Response("World Cup data worker is running.\nGET /bracket.json\nGET /healthz\n", {
    status: 200,
    headers: {
      ...corsHeaders(request, env),
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

async function getOrSeedBracket(env, ctx) {
  const existing = await readStoredBracket(env);
  if (existing) {
    return existing;
  }
  const fresh = await syncBracket(env, {
    force: true,
    reason: "HTTP request with empty KV cache.",
  });
  if (!fresh) {
    return null;
  }
  ctx.waitUntil(Promise.resolve());
  return fresh;
}

async function readStoredBracket(env) {
  return env.BRACKET_KV.get(kvKey(env), "json");
}

async function syncBracket(env, { force = false, reason = "" } = {}) {
  if (!env.BRACKET_KV) {
    throw new Error("Missing BRACKET_KV binding.");
  }
  if (!env.FOOTBALL_DATA_API_KEY) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY secret.");
  }

  const current = await readStoredBracket(env);
  const check = force
    ? { should: true, reason: reason || "Forced sync." }
    : isInsideAMatchWindow(Date.now(), current);

  console.log(check.reason);
  if (!check.should && current) {
    return current;
  }

  const res = await fetch(`${env.API_BASE || API_BASE}/competitions/${env.COMPETITION || COMPETITION}/matches`, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY },
  });

  if (res.status === 429) {
    console.warn("Rate limited by football-data.org — keeping previous bracket data untouched.");
    return current;
  }
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const rounds = buildRounds(data.matches || []);
  const output = { updated: new Date().toISOString(), rounds };

  await env.BRACKET_KV.put(kvKey(env), JSON.stringify(output));
  console.log(`Stored ${rounds.length} knockout round(s) in KV under ${kvKey(env)}`);
  return output;
}

function kvKey(env) {
  return env.BRACKET_KV_KEY || DEFAULT_KV_KEY;
}

function corsHeaders(request, env) {
  const configured = env.ALLOWED_ORIGIN || "*";
  const requestOrigin = request.headers.get("Origin");
  const allowOrigin = configured === "*" ? "*" : configured || requestOrigin || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonResponse(payload, status, request, env) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

function mapStatus(apiStatus) {
  if (apiStatus === "FINISHED" || apiStatus === "AWARDED") return "final";
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(apiStatus)) return "live";
  return "scheduled";
}

function teamCode(t) {
  if (!t) return null;
  return t.tla || (t.shortName || t.name || "").slice(0, 3).toUpperCase();
}

function poolOf(matchNum) {
  if (poolCache[matchNum]) return poolCache[matchNum];
  const pool = MATCH_TEAMS[matchNum]
    ? new Set(MATCH_TEAMS[matchNum])
    : new Set([...poolOf(MATCH_CHILDREN[matchNum][0]), ...poolOf(MATCH_CHILDREN[matchNum][1])]);
  poolCache[matchNum] = pool;
  return pool;
}

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
  return {
    home: null,
    away: null,
    score: { home: null, away: null },
    penalties: null,
    status: "scheduled",
    winner: null,
    date: MATCH_DATES[matchNum] || null,
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
    winner,
    date: mt.utcDate || MATCH_DATES[matchNum] || null,
  };
}

function buildRounds(allMatches) {
  const byStage = {};
  allMatches.forEach((mt) => {
    const stage = (mt.stage || "").toUpperCase();
    if (!byStage[stage]) byStage[stage] = [];
    byStage[stage].push(mt);
  });

  const stageOrder = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
  return stageOrder.map((stageKey) => {
    const apiList = byStage[stageKey] || [];
    return ROUND_MATCH_NUMBERS[stageKey].map((num) => {
      const mt = findApiMatch(apiList, num);
      return mt ? toMatchObject(mt, num) : placeholderMatch(num);
    });
  });
}

function isInsideAMatchWindow(now, existing) {
  if (!existing) {
    return { should: true, reason: "No bracket data yet — first import." };
  }

  const allMatches = (existing.rounds || []).flat();
  if (!allMatches.length) {
    return { should: true, reason: "Empty bracket data — first import." };
  }

  for (const m of allMatches) {
    if (m.status === "live") {
      return { should: true, reason: `Live match (${m.home?.code || "?"} vs ${m.away?.code || "?"}).` };
    }
    if (m.status === "final" || !m.date) continue;
    const kickoff = new Date(m.date).getTime();
    const windowStart = kickoff - PRE_KICKOFF_BUFFER_MIN * 60000;
    const windowEnd = kickoff + POST_KICKOFF_BUFFER_MIN * 60000;
    if (now >= windowStart && now <= windowEnd) {
      return {
        should: true,
        reason: `Active match window (${m.home?.code || "?"} vs ${m.away?.code || "?"}, kickoff ${m.date}).`,
      };
    }
  }

  return { should: false, reason: "No active match window — API call skipped." };
}
