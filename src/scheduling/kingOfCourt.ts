// King of the Court scheduling engine.
// Ported directly from the validated web prototype - do not redesign.
//
// Courts are ranked 1 (top/"King") through N (bottom). After a round:
//   - the winning pair moves up one court (top court winner stays put)
//   - the losing pair moves down one court (bottom court loser stays put)
// Ties default to team1 "winning" for movement purposes only.
//
// Players who sat out (or just arrived) form a challenger queue, sorted so
// whoever has sat out the MOST gets priority to enter. Getting this sort
// direction backwards was a real bug in the first prototype pass - it
// silently stranded players on the bench for an entire session. The tests
// in kingOfCourt.test.ts guard against that regression.
//
// This engine can only ever compute ONE round beyond what's already been
// played, since ladder movement depends on real scores - that's inherent to
// the format, not a limitation to work around.

import type { Player, Round } from "./types";
import { activePlayersForRound, computeStats, pickBestPairing } from "./shared";

export function generateKingRound(
  roundNum: number,
  players: Player[],
  priorRounds: Round[],
  numCourts: number
): Round {
  const stats = computeStats(players, priorRounds);
  const active = activePlayersForRound(players, roundNum);
  const activeIds = active.map((p) => p.id);
  const activeSet = new Set(activeIds);

  const gamesCount = Math.min(numCourts, Math.floor(active.length / 4));
  if (gamesCount === 0) {
    return { games: [], sitOuts: activeIds };
  }

  const lastRound = priorRounds[priorRounds.length - 1];
  const courtOf: Record<string, number> = {};

  if (lastRound && lastRound.games.length > 0) {
    lastRound.games.forEach((g) => {
      const hasScore = g.score && g.score.team1 != null && g.score.team2 != null;
      const team1Wins = hasScore ? (g.score.team1 as number) >= (g.score.team2 as number) : true;
      const winners = team1Wins ? g.team1 : g.team2;
      const losers = team1Wins ? g.team2 : g.team1;
      const upCourt = Math.min(gamesCount, Math.max(1, g.court - 1));
      const downCourt = Math.min(gamesCount, g.court + 1);
      winners.forEach((id) => (courtOf[id] = upCourt));
      losers.forEach((id) => (courtOf[id] = downCourt));
    });
  }

  Object.keys(courtOf).forEach((id) => {
    if (!activeSet.has(id)) delete courtOf[id];
  });

  const groups: Record<number, string[]> = {};
  for (let c = 1; c <= gamesCount; c++) groups[c] = [];

  let challengerIds: string[] = [];
  activeIds.forEach((id) => {
    const target = courtOf[id];
    if (target && groups[target].length < 4) {
      groups[target].push(id);
    } else {
      challengerIds.push(id);
    }
  });

  challengerIds.sort((a, b) => stats[b].sat - stats[a].sat || Math.random() - 0.5);

  if (challengerIds.length > 0 && gamesCount === numCourts && lastRound) {
    const bottom = gamesCount;
    const bumpCount = Math.min(2, challengerIds.length, groups[bottom].length);
    for (let i = 0; i < bumpCount; i++) {
      const bumped = groups[bottom].shift() as string;
      const entering = challengerIds.shift() as string;
      groups[bottom].push(entering);
      challengerIds.push(bumped);
    }
  }

  for (let c = gamesCount; c >= 1; c--) {
    while (groups[c].length < 4 && challengerIds.length > 0) {
      groups[c].push(challengerIds.shift() as string);
    }
  }

  const games: Round["games"] = [];
  const playingIds: Set<string> = new Set();

  for (let c = 1; c <= gamesCount; c++) {
    if (groups[c].length === 4) {
      const four = groups[c] as [string, string, string, string];
      const pairing = pickBestPairing(four, stats);
      games.push({ court: c, team1: pairing.team1, team2: pairing.team2, score: { team1: null, team2: null } });
      groups[c].forEach((id) => playingIds.add(id));
    }
  }

  const sitOuts = activeIds.filter((id) => !playingIds.has(id));
  return { games, sitOuts };
}
