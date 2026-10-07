import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  artistJoinSchema,
  memberJoinSchema,
  reservedArtistIdentityError,
  reservedMemberIdentityError,
} from "@/features/auth/register";
import type { SupabaseAccessClaims } from "@/features/auth/supabaseJwt";
import {
  sessionUserFromDb,
  toAuthUserDTO,
  type AuthUserDTO,
  type DbUserWithProfile,
} from "@/features/auth/sessionUser";
import type { SessionUser } from "@/features/auth/types";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";

const returnDoorSchema = z.object({
  door: z.literal("return"),
  name: z.string().trim().min(2).max(80).optional(),
});

const memberDoorSchema = memberJoinSchema.extend({
  door: z.literal("member"),
});

const artistDoorSchema = artistJoinSchema.extend({
  door: z.literal("artist"),
});

export const linkBodySchema = z.discriminatedUnion("door", [
  returnDoorSchema,
  memberDoorSchema,
  artistDoorSchema,
]);

export type LinkBody = z.infer<typeof linkBodySchema>;

export type LinkSupabaseResult =
  | {
      ok: false;
      code: "validation" | "conflict" | "not_found" | "unavailable";
      error: string;
      fields?: Record<string, string>;
    }
  | {
      ok: true;
      user: SessionUser;
      authUser: AuthUserDTO;
      dbUser: DbUserWithProfile;
      pendingApproval?: boolean;
      created: boolean;
    };

async function findLinkedUser(
  prisma: PrismaClient,
  claims: SupabaseAccessClaims,
): Promise<DbUserWithProfile | null> {
  const byAuth = await prisma.user.findUnique({
    where: { supabaseAuthId: claims.supabaseAuthId },
    include: { artistProfile: true },
  });
  if (byAuth) return byAuth;

  const byEmail = await prisma.user.findUnique({
    where: { email: claims.email },
    include: { artistProfile: true },
  });
  if (!byEmail) return null;

  if (!byEmail.supabaseAuthId) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { supabaseAuthId: claims.supabaseAuthId },
      include: { artistProfile: true },
    });
  }

  // Email already tied to a different Supabase identity — refuse quietly.
  if (byEmail.supabaseAuthId !== claims.supabaseAuthId) {
    return null;
  }
  return byEmail;
}

/**
 * Ensure a Prisma User exists for a verified Supabase Auth identity.
 * `return` links an existing house account; member/artist create doors for first visit.
 */
export async function linkSupabaseUser(
  prisma: PrismaClient,
  claims: SupabaseAccessClaims,
  rawBody: unknown,
): Promise<LinkSupabaseResult> {
  if (isDeniedAuthorEmail(claims.email)) {
    return { ok: false, code: "validation", error: "That email is reserved." };
  }

  const parsed = linkBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "door";
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      ok: false,
      code: "validation",
      error: parsed.error.issues[0]?.message ?? "Invalid join details",
      fields,
    };
  }

  const body = parsed.data;

  try {
    const existing = await findLinkedUser(prisma, claims);
    if (existing) {
      const session = sessionUserFromDb(existing);
      return {
        ok: true,
        user: session,
        authUser: toAuthUserDTO(existing),
        dbUser: existing,
        created: false,
        ...(existing.role === "ARTIST" && !existing.artistProfile?.approved
          ? { pendingApproval: true }
          : {}),
      };
    }

    if (body.door === "return") {
      return {
        ok: false,
        code: "not_found",
        error:
          "No house pass for that email yet. Open the member or artist door first.",
      };
    }

    if (body.door === "member") {
      const reserved = reservedMemberIdentityError(claims.email);
      if (reserved) {
        return { ok: false, code: "validation", error: reserved };
      }
      if (body.email.toLowerCase() !== claims.email) {
        return {
          ok: false,
          code: "validation",
          error: "Email must match the signed-in Supabase identity.",
          fields: { email: "Use the email you verified." },
        };
      }

      const created = await prisma.user.create({
        data: {
          email: claims.email,
          name: body.name,
          role: "VIEWER",
          supabaseAuthId: claims.supabaseAuthId,
        },
        include: { artistProfile: true },
      });

      await writeAuditLog(prisma, {
        actorId: created.id,
        action: "auth.link_supabase_member",
        targetType: "User",
        targetId: created.id,
        meta: { email: claims.email, supabaseAuthId: claims.supabaseAuthId },
      });

      return {
        ok: true,
        user: sessionUserFromDb(created),
        authUser: toAuthUserDTO(created),
        dbUser: created,
        created: true,
      };
    }

    const reserved = reservedArtistIdentityError(claims.email, body.handle);
    if (reserved) {
      return { ok: false, code: "validation", error: reserved };
    }
    if (body.email.toLowerCase() !== claims.email) {
      return {
        ok: false,
        code: "validation",
        error: "Email must match the signed-in Supabase identity.",
        fields: { email: "Use the email you verified." },
      };
    }

    const handle = body.handle.toLowerCase();
    const taken = await prisma.artistProfile.findUnique({ where: { handle } });
    if (taken) {
      return {
        ok: false,
        code: "conflict",
        error: "That handle is already taken.",
      };
    }

    const bio = `${body.medium} · ${body.intent}`;
    const created = await prisma.user.create({
      data: {
        email: claims.email,
        name: body.name,
        role: "ARTIST",
        supabaseAuthId: claims.supabaseAuthId,
        artistProfile: {
          create: {
            handle,
            bio,
            socialLinks: { medium: body.medium, intent: body.intent },
            approved: false,
          },
        },
      },
      include: { artistProfile: true },
    });

    await writeAuditLog(prisma, {
      actorId: created.id,
      action: "auth.link_supabase_artist",
      targetType: "ArtistProfile",
      targetId: created.artistProfile!.id,
      meta: {
        email: claims.email,
        handle,
        supabaseAuthId: claims.supabaseAuthId,
        approved: false,
      },
    });

    return {
      ok: true,
      user: sessionUserFromDb(created),
      authUser: toAuthUserDTO(created),
      dbUser: created,
      created: true,
      pendingApproval: true,
    };
  } catch (error) {
    console.error("[linkSupabaseUser]", error);
    return {
      ok: false,
      code: "unavailable",
      error: "Could not link your house pass.",
    };
  }
}

/**
 * Resolve a linked Prisma user for an already-verified Supabase identity
 * without creating a new door (session restore path).
 */
export async function resolveLinkedSupabaseUser(
  prisma: PrismaClient,
  claims: SupabaseAccessClaims,
): Promise<DbUserWithProfile | null> {
  if (isDeniedAuthorEmail(claims.email)) return null;
  return findLinkedUser(prisma, claims);
}
