"use server";

import { z } from "zod";
import { isDeniedAuthorEmail } from "@/features/posts/denylist";
import { writeAuditLog } from "@/features/posts/audit";
import { getPrisma } from "@/shared/lib/prisma";

const inviteSchema = z.object({
  email: z.string().email().max(200),
  handle: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/i, "Handle must be letters, numbers, _ or -"),
  name: z.string().min(2).max(120),
  operatorSecret: z.string().min(1),
});

export type InviteArtistInput = z.infer<typeof inviteSchema>;

export type InviteArtistResult =
  | { ok: false; error: string }
  | { ok: true; userId: string; handle: string };

/**
 * Operator-only invite: creates User (ARTIST) + ArtistProfile (approved=true).
 * Requires OPERATOR_SECRET. No fictional defaults — caller supplies real identity.
 * Magic-link email delivery is deferred until a transactional provider is wired.
 */
export async function inviteArtistAction(
  raw: InviteArtistInput,
): Promise<InviteArtistResult> {
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invite data",
    };
  }

  const expected = process.env.OPERATOR_SECRET;
  if (!expected || parsed.data.operatorSecret !== expected) {
    return { ok: false, error: "Operator secret rejected" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const handle = parsed.data.handle.trim().toLowerCase();
  const name = parsed.data.name.trim();

  if (isDeniedAuthorEmail(email) || handle === "studioguest") {
    return { ok: false, error: "That identity is reserved and cannot be invited" };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: "Database unavailable" };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { artistProfile: true },
    });

    if (existing?.artistProfile) {
      const updated = await prisma.artistProfile.update({
        where: { id: existing.artistProfile.id },
        data: { approved: true, handle },
      });
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, role: "ARTIST" },
      });
      await writeAuditLog(prisma, {
        actorId: null,
        action: "artist.approve",
        targetType: "ArtistProfile",
        targetId: updated.id,
        meta: { email, handle, via: "inviteArtistAction", reapprove: true },
      });
      return { ok: true, userId: existing.id, handle: updated.handle };
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: "ARTIST",
        artistProfile: {
          create: {
            handle,
            approved: true,
          },
        },
      },
      include: { artistProfile: true },
    });

    await writeAuditLog(prisma, {
      actorId: null,
      action: "artist.invite",
      targetType: "ArtistProfile",
      targetId: user.artistProfile!.id,
      meta: { email, handle, via: "inviteArtistAction" },
    });

    return { ok: true, userId: user.id, handle: user.artistProfile!.handle };
  } catch (error) {
    console.error("[inviteArtistAction]", error);
    return { ok: false, error: "Could not invite artist" };
  }
}
