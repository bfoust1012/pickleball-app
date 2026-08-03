import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getDeviceId } from "../lib/deviceId";
import type { Session, SessionSettings } from "./types";

const SESSIONS_COLLECTION = "sessions";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Short human-shareable code derived from the session id (per Section 7). */
export function sessionCode(sessionId: string): string {
  return sessionId.slice(0, 6).toUpperCase();
}

const DEFAULT_SETTINGS: SessionSettings = {
  numCourts: 2,
  totalRounds: 9,
  format: "king_of_court",
  courtNames: ["Court 1", "Court 2"],
  requireApproval: false,
  maxPlayers: null,
};

/**
 * Creates a brand-new session document in Firestore, stamped with this
 * device's anonymous id (per Section 5 - no accounts, join-code-as-credential
 * model). Returns the full Session object, including its generated id.
 */
export async function createSession(name: string): Promise<Session> {
  const deviceId = await getDeviceId();
  const id = uid();
  const now = Date.now();

  const session: Session = {
    id,
    name: name.trim() || "New Session",
    players: [],
    settings: DEFAULT_SETTINGS,
    rounds: [],
    signups: [],
    createdAt: now,
    updatedAt: now,
    createdByDeviceId: deviceId,
  };

  await setDoc(doc(db, SESSIONS_COLLECTION, id), session);
  return session;
}

/** Fetches a session by id. Returns null if it doesn't exist. */
export async function getSession(sessionId: string): Promise<Session | null> {
  const snap = await getDoc(doc(db, SESSIONS_COLLECTION, sessionId));
  if (!snap.exists()) return null;
  return snap.data() as Session;
}

/**
 * Applies a partial update to a session (e.g. new players, new rounds) and
 * bumps updatedAt. The join code (derived from the id) IS the credential -
 * anyone with it can read/write, per Section 5's deliberate no-login model.
 */
export async function updateSession(
  sessionId: string,
  patch: Partial<Omit<Session, "id" | "createdAt" | "createdByDeviceId">>
): Promise<void> {
  await updateDoc(doc(db, SESSIONS_COLLECTION, sessionId), {
    ...patch,
    updatedAt: Date.now(),
  });
}
