// Rotating-Partner Round Robin scheduling engine ("Unique Partners" mode).
// Ported directly from the validated web prototype - do not redesign.
//
// Unlike King of the Court, this engine pre-generates the FULL schedule in
// one pass rather than round-by-round, since it does not depend on scores.
//
// Approach: for each round, pick sit-outs (fairness-first: whoever has sat
// out LEAST so far is preferred to sit, with a heavy penalty against sitting
// out two rounds in a row), then randomly assign the remaining players into
// games and courts, then hill-climb: repeatedly try every pairwise
// player-slot swap and every pairwise court-label swap, keeping any swap
// that lowers total cost, until a full pass makes no improvement. Repeat
// with several random restarts and keep the best result.
//
// Cost function: repeat-partner count squared + repeat-opponent count
// squared (weighted lower) + court-time imbalance squared, so it balances
// time across every named court, not just one.

import type { Player, Round, StatsByPlayer } from "./types";
import { activePlayersForRound, computeStats } from "./shared";
import { createRNG, shuffle, type RNG } from "./rng";

export type RotatingPartnersWeights = {
  wPartner: number;
  wCourt: number;
};

export const DEFAULT_WEIGHTS: RotatingPartnersWeights = {
  wPartner: 1.6,
  wCourt: 0.5,
};

const RESTARTS = 24;

type WorkingGame = {
  court: number;
  team1: [string, string];
  team2: [string, string];
};

function gameCost(g: WorkingGame, stats: StatsByPlayer, wPartner: number, wCourt: number): number {
  let cost = 0;
  const p1 = stats[g.team1[0]].partners[g.team1[1]] || 0;
  const p2 = stats[g.team2[0]].partners[g.team2[1]] || 0;
  cost += (p1 * p1 + p2 * p2) * wPartner;

  let oppCost = 0;
  g.team1.forEach((a) => {
    g.team2.forEach((b) => {
      oppCost += Math.pow(stats[a].opponents[b] || 0, 2);
    });
  });
  cost += oppCost * wPartner * 0.6;

  const four = [...g.team1, ...g.team2];
  let cCost = 0;
  four.forEach((id) => {
    cCost += Math.pow(stats[id].courtCounts[g.court] || 0, 2);
  });
  cost += cCost * wCourt;

  return cost;
}

function totalCost(games: WorkingGame[], stats: StatsByPlayer, wPartner: number, wCourt: number): number {
  return games.reduce((sum, g) => sum + gameCost(g, stats, wPartner, wCourt), 0);
}

function hillClimb(
  games: WorkingGame[],
  stats: StatsByPlayer,
  wPartner: number,
  wCourt: number
): WorkingGame[] {
  type Slot = { gi: number; team: "team1" | "team2"; i: 0 | 1 };
  const slots: Slot[] = [];
  games.forEach((_, gi) => {
    slots.push({ gi, team: "team1", i: 0 });
    slots.push({ gi, team: "team1", i: 1 });
    slots.push({ gi, team: "team2", i: 0 });
    slots.push({ gi, team: "team2", i: 1 });
  });

  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard += 1;

    for (let a = 0; a < slots.length; a++) {
      for (let b = a + 1; b < slots.length; b++) {
        const sa = slots[a];
        const sb = slots[b];
        const affectedIdx = new Set([sa.gi, sb.gi]);
        const before = [...affectedIdx].reduce(
          (sum, gi) => sum + gameCost(games[gi], stats, wPartner, wCourt),
          0
        );
        const tmp = games[sa.gi][sa.team][sa.i];
        games[sa.gi][sa.team][sa.i] = games[sb.gi][sb.team][sb.i];
        games[sb.gi][sb.team][sb.i] = tmp;
        const after = [...affectedIdx].reduce(
          (sum, gi) => sum + gameCost(games[gi], stats, wPartner, wCourt),
          0
        );
        if (after < before - 1e-9) {
          improved = true;
        } else {
          const tmp2 = games[sa.gi][sa.team][sa.i];
          games[sa.gi][sa.team][sa.i] = games[sb.gi][sb.team][sb.i];
          games[sb.gi][sb.team][sb.i] = tmp2;
        }
      }
    }

    for (let i = 0; i < games.length; i++) {
      for (let j = i + 1; j < games.length; j++) {
        if (games[i].court === games[j].court) continue;
        const before =
          gameCost(games[i], stats, wPartner, wCourt) + gameCost(games[j], stats, wPartner, wCourt);
        const tmp = games[i].court;
        games[i].court = games[j].court;
        games[j].court = tmp;
        const after =
          gameCost(games[i], stats, wPartner, wCourt) + gameCost(games[j], stats, wPartner, wCourt);
        if (after < before - 1e-9) {
          improved = true;
        } else {
          const tmp2 = games[i].court;
          games[i].court = games[j].court;
          games[j].court = tmp2;
        }
      }
    }
  }
  return games;
}

function generateOneRound(
  roundNum: number,
  activePlayers: Player[],
  stats: StatsByPlayer,
  numCourts: number,
  weights: RotatingPartnersWeights,
  rng: RNG
): Round {
  const n = activePlayers.length;
  const gamesCount = Math.min(numCourts, Math.floor(n / 4));

  if (gamesCount === 0) {
    return { games: [], sitOuts: activePlayers.map((p) => p.id) };
  }

  const scored = activePlayers.map((p) => {
    const s = stats[p.id];
    const consecutive = s.lastSat === roundNum - 1 ? 100000 : 0;
    const score = s.sat * 100 + consecutive + rng() * 3;
    return { p, score };
  });
  scored.sort((a, b) => a.score - b.score);

  const sitOutCount = n - gamesCount * 4;
  const sitOutPlayers = scored.slice(0, sitOutCount).map((s) => s.p);
  const sitOutIds = new Set(sitOutPlayers.map((p) => p.id));
  const playing = activePlayers.filter((p) => !sitOutIds.has(p.id));

  const { wPartner, wCourt } = weights;

  let best: { games: WorkingGame[]; cost: number } | null = null;

  for (let restart = 0; restart < RESTARTS; restart++) {
    const shuffled = shuffle(playing, rng);
    let games: WorkingGame[] = [];
    for (let i = 0; i < gamesCount; i++) {
      const group = shuffled.slice(i * 4, i * 4 + 4);
      games.push({
        court: 0,
        team1: [group[0].id, group[1].id],
        team2: [group[2].id, group[3].id],
      });
    }
    const courtLabels = shuffle(
      Array.from({ length: numCourts }, (_, i) => i + 1),
      rng
    ).slice(0, gamesCount);
    games.forEach((g, i) => {
      g.court = courtLabels[i];
    });

    games = hillClimb(games, stats, wPartner, wCourt);
    const cost = totalCost(games, stats, wPartner, wCourt);

    if (best === null || cost < best.cost) best = { games, cost };
  }

  const finalGames: Round["games"] = best!.games.map((g) => ({
    court: g.court,
    team1: g.team1,
    team2: g.team2,
    score: { team1: null, team2: null },
  }));

  return { games: finalGames, sitOuts: sitOutPlayers.map((p) => p.id) };
}

export function generateRotatingPartnersSchedule(
  players: Player[],
  numCourts: number,
  totalRounds: number,
  seed: number = Date.now(),
  weights: RotatingPartnersWeights = DEFAULT_WEIGHTS
): Round[] {
  const rng = createRNG(seed);
  const rounds: Round[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const roundNum = r + 1;
    const stats = computeStats(players, rounds);
    const active = activePlayersForRound(players, roundNum);
    const round = generateOneRound(roundNum, active, stats, numCourts, weights, rng);
    rounds.push(round);
  }

  return rounds;
}
