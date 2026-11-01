import { z } from "zod";
import { LEAD_PLATFORMS } from "@/lib/ghl";
import {
  artistJoinSchema,
  memberJoinSchema,
} from "@/features/auth/register";
import type { AuthUserDTO } from "@/features/auth/sessionUser";
import type { IssuedSession } from "@/features/auth/requestSession";

/** Optional client tag the app sends so the CRM can tell iOS testers apart. */
const joinPlatformSchema = z.enum(LEAD_PLATFORMS).optional();

export const joinMemberBodySchema = memberJoinSchema.extend({
  door: z.literal("member"),
  platform: joinPlatformSchema,
});

export const joinArtistBodySchema = artistJoinSchema.extend({
  door: z.literal("artist"),
  platform: joinPlatformSchema,
});

export const joinBodySchema = z.discriminatedUnion("door", [
  joinMemberBodySchema,
  joinArtistBodySchema,
]);

export const requestCodeBodySchema = z.object({
  email: z.string().trim().email().max(200),
});

export const verifyCodeBodySchema = z.object({
  email: z.string().trim().email().max(200),
  code: z.string().trim().min(4).max(12),
});

export type AuthSessionDTO = IssuedSession & {
  user: AuthUserDTO;
  pendingApproval?: boolean;
};

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
