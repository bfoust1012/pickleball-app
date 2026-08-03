import type { Player, Round, StatsByPlayer } from "./types";

export function computeStats(players: Player[], rounds: Round[]): StatsByPlayer {
  const stats: StatsByPlayer = {};

  players.forEach((p) => {
    stats[p.id] = {
      played: 0,
      sat: 0,
      courtCounts: {},
      partners: {},
      opponents: {},
      lastSat: null,
      lastPlayed: null,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  });

  rounds.forEach((round, idx) => {
    const roundNum = idx + 1;

    round.sitOuts.forEach((id) => {
      if (!stats[id]) return;
      stats[id].sat += 1;
      stats[id].lastSat = roundNum;
    });

    round.games.forEach((g) => {
      const four = [...g.team1, ...g.team2];
      four.forEach((id) => {
        if (!stats[id]) return;
        stats[id].played += 1;
        stats[id].courtCounts[g.court] = (stats[id].courtCounts[g.court] || 0) + 1;
        stats[id].lastPlayed = roundNum;
      });

      const addPartner = (a: string, b: string) => {
        if (!stats[a]) return;
        stats[a].partners[b] = (stats[a].partners[b] || 0) + 1;
      };
      addPartner(g.team1[0], g.team1[1]);
      addPartner(g.team1[1], g.team1[0]);
      addPartner(g.team2[0], g.team2[1]);
      addPartner(g.team2[1], g.team2[0]);

      g.team1.forEach((a) => {
        g.team2.forEach((b) => {
          if (stats[a]) stats[a].opponents[b] = (stats[a].opponents[b] || 0) + 1;
          if (stats[b]) stats[b].opponents[a] = (stats[b].opponents[a] || 0) + 1;
        });
      });

      const s = g.score;
      if (
        s &&
        s.team1 != null &&
        s.team2 != null &&
        !Number.isNaN(s.team1) &&
        !Number.isNaN(s.team2)
      ) {
        const team1Won = s.team1 > s.team2;
        g.team1.forEach((id) => {
          if (!stats[id]) return;
          stats[id].pointsFor += s.team1 as number;
          stats[id].pointsAgainst += s.team2 as number;
          if (s.team1 !== s.team2) team1Won ? (stats[id].wins += 1) : (stats[id].losses += 1);
        });
        g.team2.forEach((id) => {
          if (!stats[id]) return;
          stats[id].pointsFor += s.team2 as number;
          stats[id].pointsAgainst += s.team1 as number;
          if (s.team1 !== s.team2) !team1Won ? (stats[id].wins += 1) : (stats[id].losses += 1);
        });
      }
    });
  });

  return stats;
}

export function activePlayersForRound(players: Player[], roundNum: number): Player[] {
  return players.filter(
    (p) => p.arrivalRound <= roundNum && (p.departureRound == null || p.departureRound >= roundNum)
  );
}

export function pickBestPairing(
  fourIds: [string, string, string, string],
  stats: StatsByPlayer
): { team1: [string, string]; team2: [string, string] } {
  const combos: Array<{ team1: [string, string]; team2: [string, string] }> = [
    { team1: [fourIds[0], fourIds[1]], team2: [fourIds[2], fourIds[3]] },
    { team1: [fourIds[0], fourIds[2]], team2: [fourIds[1], fourIds[3]] },
    { team1: [fourIds[0], fourIds[3]], team2: [fourIds[1], fourIds[2]] },
  ];

  let best: { team1: [string, string]; team2: [string, string]; cost: number } | null = null;

  combos.forEach(({ team1, team2 }) => {
    const c1 = stats[team1[0]].partners[team1[1]] || 0;
    const c2 = stats[team2[0]].partners[team2[1]] || 0;
    const cost = c1 * c1 + c2 * c2;
    if (best === null || cost < best.cost) {
      best = { team1, team2, cost };
    }
  });

  return { team1: best!.team1, team2: best!.team2 };
}
