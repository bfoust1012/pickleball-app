// Core data models shared across all scheduling engines.
// Kept as plain TypeScript with zero React/React Native imports so this file
// (and everything in src/scheduling/) is independently testable and portable.

export type PlayerStatus = "active" | "resting" | "absent" | "injured";

export type Player = {
  id: string;
  name: string;
  nickname?: string;
  status: PlayerStatus;
  color?: string;
  arrivalRound: number; // round number this player becomes available (1 = from the start)
  departureRound?: number; // last round this player is available for (inclusive)
};

export type Court = {
  number: number;
  name: string; // editable, e.g. "King's Court", "Court 2"
  available: boolean;
  color?: string;
};

export type GameScore = {
  team1: number | null;
  team2: number | null;
};

export type GameStatus =
  | "scheduled"
  | "in_progress"
  | "complete"
  | "forfeit"
  | "injury"
  | "incomplete";

export type Game = {
  court: number;
  team1: [string, string]; // player ids
  team2: [string, string]; // player ids
  score: GameScore;
  status?: GameStatus;
  startedAt?: number;
  durationSeconds?: number;
};

export type Round = {
  games: Game[];
  sitOuts: string[]; // player ids
};

export type PlayerStats = {
  played: number;
  sat: number;
  courtCounts: Record<number, number>;
  partners: Record<string, number>;
  opponents: Record<string, number>;
  lastSat: number | null;
  lastPlayed: number | null;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type StatsByPlayer = Record<string, PlayerStats>;

export type SessionFormat =
  | "open_play"
  | "round_robin_rotating"
  | "round_robin_fixed"
  | "king_of_court"
  | "ladder";

export type SessionSettings = {
  numCourts: number;
  totalRounds: number;
  format: SessionFormat;
  courts: Court[];
  requireApproval: boolean;
  maxPlayers: number | null;
};

export type SignupStatus = "pending" | "waitlisted";

export type SignupEntry = {
  id: string;
  name: string;
  nickname?: string;
  attending: "yes" | "maybe" | "no";
  note?: string;
  submittedAt: number;
  status: SignupStatus;
};

export type Session = {
  id: string;
  name: string;
  players: Player[];
  settings: SessionSettings;
  rounds: Round[];
  signups: SignupEntry[];
  createdAt: number;
  updatedAt: number;
  createdByDeviceId: string;
};
