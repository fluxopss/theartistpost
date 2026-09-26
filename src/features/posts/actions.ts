"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/adapter";
import {
  authorizePublisher,
  isMockGuestSession,
  PUBLISHING_CLOSED_ERROR,
  resolvePostStatus,
} from "@/features/auth/publishGate";
import { writeAuditLog } from "@/features/posts/audit";
import { getPrisma } from "@/shared/lib/prisma";

const createPostSchema = z.object({
  title: z.string().min(2).max(120),
  tags: z.array(z.string().min(1)).max(8).default([]),
  visibility: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  mediaUrl: z
    .string()
    .refine(
      (v) =>
        !v ||
        v.startsWith("/") ||
        v.startsWith("https://") ||
        v.startsWith("http://"),
      "Invalid media URL",
    )
    .optional()
    .or(z.literal("")),
  mediaType: z.enum(["IMAGE", "VIDEO", "EMBED", "CANVAS"]).default("IMAGE"),
  description: z.string().max(4000).optional(),
  primaryColor: z.string().optional(),
  layoutStyle: z.enum(["framed", "bleed", "stack", "orbit"]).default("framed"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export type CreatePostResult =
  | { ok: false; error: string }
  | { ok: true; mode: "db"; slug: string; message?: string };

export { PUBLISHING_CLOSED_ERROR };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/**
 * Create a post for an approved ARTIST or ADMIN.
 * Mock guest sessions are refused. Never auto-creates Studio Guest.
 * Default visibility is DRAFT; PUBLISHED only when authorizePublisher allows.
 */
export async function createPostAction(
  raw: CreatePostInput,
): Promise<CreatePostResult> {
  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid post data",
    };
  }

  const session = await getSession();
  if (!session || isMockGuestSession(session)) {
    return { ok: false, error: PUBLISHING_CLOSED_ERROR };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: PUBLISHING_CLOSED_ERROR };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.email },
      include: { artistProfile: true },
    });

    const gate = authorizePublisher(session, dbUser);
    if (!gate.ok) {
      return { ok: false, error: gate.error };
    }

    const data = parsed.data;
    const status = resolvePostStatus(data.visibility, gate.canPublish);
    const slugBase = slugify(data.title) || "untitled";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const tagConnect = [];
    for (const name of data.tags) {
      const tagSlug = slugify(name);
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        create: { name, slug: tagSlug },
        update: {},
      });
      tagConnect.push({ id: tag.id });
    }

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        theme: {
          primary: data.primaryColor,
          layoutStyle: data.layoutStyle,
        },
        authorId: dbUser!.id,
        tags: { connect: tagConnect },
      },
    });

    await writeAuditLog(prisma, {
      actorId: dbUser!.id,
      action: status === "PUBLISHED" ? "post.publish" : "post.create_draft",
      targetType: "Post",
      targetId: post.id,
      meta: { slug: post.slug, status },
    });

    revalidatePath("/explore");
    revalidatePath("/");
    if (dbUser!.artistProfile?.handle) {
      revalidatePath(`/artist/${dbUser!.artistProfile.handle}`);
    }

    return { ok: true, mode: "db", slug: post.slug };
  } catch (error) {
    console.error("[createPostAction]", error);
    return { ok: false, error: "Could not save post" };
  }
}
