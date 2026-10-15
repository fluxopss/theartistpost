import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

/** Same alphabet and length as `artistJoinSchema` — lowercase on the way in. */
export const HANDLE_PATTERN = /^[a-z0-9_-]{2,40}$/;

export const RESERVED_HANDLES = [
  "admin",
  "theartistpost",
  "tap",
  "support",
  "studioguest",
  "api",
  "settings",
  "me",
  "u",
] as const;

const reserved = new Set<string>(RESERVED_HANDLES);

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedHandle(handle: string): boolean {
  return reserved.has(normalizeHandle(handle));
}

/** Trims + lowercases, then enforces the pattern and the reserved list. */
export const handleSchema = z
  .string()
  .transform(normalizeHandle)
  .refine((value) => HANDLE_PATTERN.test(value), {
    message: "Handle must be 2–40 letters, numbers, _ or -.",
  })
  .refine((value) => !isReservedHandle(value), {
    message: "That handle is reserved.",
  });

/**
 * True when no OTHER user already uses the handle, either as `User.handle` or
 * as an `ArtistProfile.handle` (pre-backfill drift). Case-insensitive.
 */
export async function isHandleAvailable(
  prisma: PrismaClient,
  handle: string,
  exceptUserId: string,
): Promise<boolean> {
  const wanted = normalizeHandle(handle);
  const [byUser, byArtist] = await Promise.all([
    prisma.user.findFirst({
      where: {
        handle: { equals: wanted, mode: "insensitive" },
        id: { not: exceptUserId },
      },
      select: { id: true },
    }),
    prisma.artistProfile.findFirst({
      where: {
        handle: { equals: wanted, mode: "insensitive" },
        userId: { not: exceptUserId },
      },
      select: { id: true },
    }),
  ]);
  return !byUser && !byArtist;
}

/** True for a Prisma unique-constraint failure on a handle column. */
export function isHandleUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, meta } = error as {
    code?: unknown;
    meta?: { target?: unknown };
  };
  if (code !== "P2002") return false;
  const target = meta?.target;
  const names = Array.isArray(target) ? target : [target];
  return names.some((name) => typeof name === "string" && name.includes("handle"));
}
