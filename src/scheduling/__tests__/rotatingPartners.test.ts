import { generateRotatingPartnersSchedule } from "../rotatingPartners";
import type { Player } from "../types";

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `P${i + 1}`,
    name: `P${i + 1}`,
    status: "active" as const,
    arrivalRound: 1,
  }));
}

describe("generateRotatingPartnersSchedule - basic integrity", () => {
  it("produces the requested number of rounds", () => {
    const players = makePlayers(8);
    const schedule = generateRotatingPartnersSchedule(players, 2, 5, 42);
    expect(schedule).toHaveLength(5);
  });

  it("never repeats a player within the same round", () => {
    const players = makePlayers(9);
    const schedule = generateRotatingPartnersSchedule(players, 2, 6, 42);

    schedule.forEach((round) => {
      const allIds = round.games.flatMap((g) => [...g.team1, ...g.team2]);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);

      const sitOutSet = new Set(round.sitOuts);
      allIds.forEach((id) => expect(sitOutSet.has(id)).toBe(false));
    });
  });

  it("is fully deterministic given the same seed", () => {
    const players = makePlayers(12);
    const scheduleA = generateRotatingPartnersSchedule(players, 3, 6, 12345);
    const scheduleB = generateRotatingPartnersSchedule(players, 3, 6, 12345);
    expect(scheduleA).toEqual(scheduleB);
  });
});

describe("generateRotatingPartnersSchedule - edge cases", () => {
  it("handles 3 players and 1 court cleanly: benches everyone, no crash", () => {
    const players = makePlayers(3);
    expect(() => generateRotatingPartnersSchedule(players, 1, 4, 1)).not.toThrow();

    const schedule = generateRotatingPartnersSchedule(players, 1, 4, 1);
    schedule.forEach((round) => {
      expect(round.games).toHaveLength(0);
      expect(round.sitOuts).toHaveLength(3);
    });
  });

  const configs: Array<[number, number]> = [
    [4, 1],
    [5, 1],
    [8, 2],
    [9, 2],
    [12, 3],
    [16, 4],
    [24, 4],
  ];

  configs.forEach(([playerCount, courts]) => {
    it(`does not crash for ${playerCount} players / ${courts} courts`, () => {
      const players = makePlayers(playerCount);
      expect(() =>
        generateRotatingPartnersSchedule(players, courts, 6, 99)
      ).not.toThrow();
    });
  });

  it("leaves nobody sitting out when the roster divides evenly into courts", () => {
    const players = makePlayers(8);
    const schedule = generateRotatingPartnersSchedule(players, 2, 6, 7);
    schedule.forEach((round) => {
      expect(round.sitOuts).toHaveLength(0);
    });
  });
});

describe("generateRotatingPartnersSchedule - fairness", () => {
  it("keeps sit-out counts within 1 of each other over many rounds when player count doesn't divide evenly", () => {
    const players = makePlayers(9);
    const schedule = generateRotatingPartnersSchedule(players, 2, 12, 55);

    const satCounts: Record<string, number> = {};
    players.forEach((p) => (satCounts[p.id] = 0));
    schedule.forEach((round) => {
      round.sitOuts.forEach((id) => (satCounts[id] += 1));
    });

    const values = Object.values(satCounts);
    const spread = Math.max(...values) - Math.min(...values);
    expect(spread).toBeLessThanOrEqual(1);
  });

  it("keeps games played counts within 1 of each other over many rounds", () => {
    const players = makePlayers(9);
    const schedule = generateRotatingPartnersSchedule(players, 2, 12, 55);

    const playedCounts: Record<string, number> = {};
    players.forEach((p) => (playedCounts[p.id] = 0));
    schedule.forEach((round) => {
      round.games.forEach((g) => {
        [...g.team1, ...g.team2].forEach((id) => (playedCounts[id] += 1));
      });
    });

    const values = Object.values(playedCounts);
    const spread = Math.max(...values) - Math.min(...values);
    expect(spread).toBeLessThanOrEqual(1);
  });
});
