// Change detection between two consecutive bracket payloads.
//
// buildRounds() always produces the rounds in the same fixed order and each
// round's matches in the same fixed positions (topology is hardcoded in
// lib/bracket.js), so two payloads can be compared slot-by-slot using
// [roundIndex][matchIndex] as a stable identity. That lets us emit precise,
// typed events (kickoff / goal / fulltime) that server.js pushes over SSE and,
// later, turns into web-push notifications.
//
// Event shape:
//   { type: "kickoff",  round, idx, match }  // status went scheduled -> live
//   { type: "goal",     round, idx, match }  // score changed while status live
//   { type: "fulltime", round, idx, match }  // status went -> final

function scoreChanged(prev, next) {
  const p = (prev && prev.score) || {};
  const n = (next && next.score) || {};
  return p.home !== n.home || p.away !== n.away;
}

// Compares the previous and next bracket and returns an ordered list of typed
// events describing what changed. On the very first run (previousBracket is
// null) we emit NOTHING: otherwise a fresh process/restart would flood every
// connected client (and every push subscriber) with events for matches that
// are already live/final from before it started.
function detectChanges(previousBracket, newBracket) {
  const events = [];
  if (!previousBracket || !newBracket) return events;

  const prevRounds = previousBracket.rounds || [];
  const nextRounds = newBracket.rounds || [];

  nextRounds.forEach((nextRound, round) => {
    const prevRound = prevRounds[round] || [];
    nextRound.forEach((next, idx) => {
      const prev = prevRound[idx];
      if (!prev || !next) return;

      const before = prev.status;
      const after = next.status;

      if (before !== "final" && after === "final") {
        events.push({ type: "fulltime", round, idx, match: next });
        return;
      }
      if (before !== "live" && after === "live") {
        events.push({ type: "kickoff", round, idx, match: next });
        return;
      }
      if (before === "live" && after === "live" && scoreChanged(prev, next)) {
        events.push({ type: "goal", round, idx, match: next });
      }
    });
  });

  return events;
}

module.exports = { detectChanges };
