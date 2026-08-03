import { generateKingRound } from "../kingOfCourt";
import type { Player, Round } from "../types";

function makePlayer(id: string, arrivalRound = 1): Player {
  return { id, name: id, status: "active", arrivalRound };
}

const players12: Player[] = [
  "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12",
].map((id) => makePlayer(id));

describe("generateKingRound - basic round generation", () => {
  it("fills every court with no prior rounds and leaves nobody sitting out when player count divides evenly", () => {
    const players8 = players12.slice(0, 8);
    const round = generateKingRound(1, players8, [], 2);

    expect(round.games).toHaveLength(2);
    expect(round.sitOuts).toHaveLength(0);

    const playing = new Set(round.games.flatMap((g) => [...g.team1, ...g.team2]));
    expect(playing.size).toBe(8);
  });

  it("benches the correct number of players when the roster isn't a multiple of 4", () => {
    const players9 = players12.slice(0, 9);
    const round = generateKingRound(1, players9, [], 2);

    expect(round.games).toHaveLength(2);
    expect(round.sitOuts).toHaveLength(1);
  });
});

describe("generateKingRound - ladder movement", () => {
  it("moves winners up a court and losers down a court", () => {
    const players8 = players12.slice(0, 8);
    const round1: Round = {
      games: [
        {
          court: 1,
          team1: ["P1", "P2"],
          team2: ["P3", "P4"],
          score: { team1: 21, team2: 10 },
        },
        {
          court: 2,
          team1: ["P5", "P6"],
          team2: ["P7", "P8"],
          score: { team1: 21, team2: 10 },
        },
      ],
      sitOuts: [],
    };

    const round2 = generateKingRound(2, players8, [round1], 2);
    const courtOf: Record<string, number> = {};
    round2.games.forEach((g) => {
      [...g.team1, ...g.team2].forEach((id) => (courtOf[id] = g.court));
    });

    expect(courtOf["P1"]).toBe(1);
    expect(courtOf["P2"]).toBe(1);
    expect(courtOf["P3"]).toBe(2);
    expect(courtOf["P4"]).toBe(2);
    expect(courtOf["P5"]).toBe(1);
    expect(courtOf["P6"]).toBe(1);
    expect(courtOf["P7"]).toBe(2);
    expect(courtOf["P8"]).toBe(2);
  });

  it("does not crash on a tie and defaults team1 as the winner for movement", () => {
    const players8 = players12.slice(0, 8);
    const tiedRound: Round = {
      games: [
        {
          court: 1,
          team1: ["P1", "P2"],
          team2: ["P3", "P4"],
          score: { team1: 15, team2: 15 },
        },
        {
          court: 2,
          team1: ["P5", "P6"],
          team2: ["P7", "P8"],
          score: { team1: null, team2: null },
        },
      ],
      sitOuts: [],
    };

    expect(() => generateKingRound(2, players8, [tiedRound], 2)).not.toThrow();

    const round2 = generateKingRound(2, players8, [tiedRound], 2);
    const courtOf: Record<string, number> = {};
    round2.games.forEach((g) => {
      [...g.team1, ...g.team2].forEach((id) => (courtOf[id] = g.court));
    });

    expect(courtOf["P1"]).toBe(1);
    expect(courtOf["P5"]).toBe(1);
  });
});

describe("generateKingRound - challenger queue sit-out priority (regression guard)", () => {
  it("prioritizes players who have sat out the most when filling open slots", () => {
    const round1: Round = {
      games: [
        {
          court: 1,
          team1: ["P1", "P2"],
          team2: ["P3", "P4"],
          score: { team1: 21, team2: 10 },
        },
        {
          court: 2,
          team1: ["P5", "P6"],
          team2: ["P7", "P8"],
          score: { team1: 21, team2: 10 },
        },
      ],
      sitOuts: ["P9", "P10", "P11", "P12"],
    };

    const round2: Round = {
      games: [
        {
          court: 1,
          team1: ["P1", "P2"],
          team2: ["P3", "P4"],
          score: { team1: 21, team2: 10 },
        },
        {
          court: 2,
          team1: ["P5", "P6"],
          team2: ["P11", "P12"],
          score: { team1: 21, team2: 10 },
        },
      ],
      sitOuts: ["P7", "P8", "P9", "P10"],
    };

    const round3 = generateKingRound(3, players12, [round1, round2], 2);
    const playing = new Set(round3.games.flatMap((g) => [...g.team1, ...g.team2]));

    expect(playing.has("P9")).toBe(true);
    expect(playing.has("P10")).toBe(true);
    expect(playing.has("P7")).toBe(false);
    expect(playing.has("P8")).toBe(false);

    expect(round3.sitOuts).toContain("P7");
    expect(round3.sitOuts).toContain("P8");
  });
});
