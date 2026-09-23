import { nextLitRooms } from "@/features/night/play";

export const NIGHT_PASS_KEY = "tap-night-pass";
export const NIGHT_SPARKS_KEY = "tap-night-sparks";
export const NIGHT_FLOOR_KEY = "tap-night-floor";

export type NightPass = {
  eventId: string;
  name: string;
  email: string;
  party: number;
  note: string;
  code: string;
  delivered: boolean;
  savedAt: string;
};

export type NightSpark = {
  id: string;
  eventId: string;
  body: string;
  from: string;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getNightPass(eventId: string): NightPass | null {
  const stored = readJson<NightPass | null>(NIGHT_PASS_KEY, null);
  if (!stored || stored.eventId !== eventId || !stored.code) return null;
  return stored;
}

export function saveNightPass(pass: NightPass) {
  writeJson(NIGHT_PASS_KEY, pass);
}

export function getNightSparks(eventId: string): NightSpark[] {
  const all = readJson<NightSpark[]>(NIGHT_SPARKS_KEY, []);
  return all.filter((spark) => spark.eventId === eventId).slice(0, 8);
}

export function getLitRooms(eventId: string): string[] {
  const stored = readJson<{ eventId: string; lit: string[] } | null>(
    NIGHT_FLOOR_KEY,
    null,
  );
  if (!stored || stored.eventId !== eventId || !Array.isArray(stored.lit)) return [];
  return stored.lit;
}

export function saveLitRooms(eventId: string, lit: string[]) {
  writeJson(NIGHT_FLOOR_KEY, { eventId, lit });
}

export function toggleLitRoom(eventId: string, roomId: string): string[] {
  const next = nextLitRooms(getLitRooms(eventId), roomId);
  saveLitRooms(eventId, next);
  return next;
}

export function addNightSpark(spark: NightSpark): NightSpark[] {
  const all = readJson<NightSpark[]>(NIGHT_SPARKS_KEY, []);
  const next = [spark, ...all.filter((item) => item.eventId === spark.eventId)].slice(
    0,
    8,
  );
  const others = all.filter((item) => item.eventId !== spark.eventId);
  writeJson(NIGHT_SPARKS_KEY, [...next, ...others].slice(0, 24));
  return next;
}
