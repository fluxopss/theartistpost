import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "@/features/auth/types";
import { getAuthSecret } from "@/features/auth/secret";

export const SESSION_COOKIE = "tap_session";
const SESSION_DAYS = 30;
/** Session lifetime in seconds (cookie maxAge and Bearer token exp). */
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  handle?: string;
  image?: string | null;
  exp: number;
};

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(body: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(body).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function encodeSessionToken(
  user: SessionUser,
  secret: string,
  maxAgeSec = SESSION_MAX_AGE,
): string {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    handle: user.handle,
    image: user.image ?? null,
    exp: Date.now() + maxAgeSec * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export function decodeSessionToken(
  token: string,
  secret: string,
): SessionUser | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, secret);
  if (!safeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload.sub || !payload.email || !payload.name || !payload.role) {
      return null;
    }
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      handle: payload.handle,
      image: payload.image ?? null,
    };
  } catch {
    return null;
  }
}

export async function readSessionFromCookie(): Promise<SessionUser | null> {
  const secret = getAuthSecret();
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSessionToken(raw, secret);
}

export async function writeSessionCookie(user: SessionUser): Promise<boolean> {
  const secret = getAuthSecret();
  if (!secret) return false;
  const token = encodeSessionToken(user, secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return true;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
