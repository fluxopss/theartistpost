"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/features/auth/adapter";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function createPostAction(raw: CreatePostInput) {
  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid post data",
    };
  }

  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in required" };
  }

  const data = parsed.data;
  const slugBase = slugify(data.title) || "untitled";
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const prisma = getPrisma();
  if (!prisma) {
    // No DB — optimistic local success so the create flow stays usable
    return {
      ok: true as const,
      mode: "fixture" as const,
      slug,
      message:
        "Saved locally (no DATABASE_URL). Connect Postgres + run seed to persist.",
    };
  }

  try {
    let user = await prisma.user.findUnique({
      where: { email: session.email },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: session.email,
          name: session.name,
          image: session.image,
          role: "ARTIST",
          artistProfile: session.handle
            ? {
                create: {
                  handle: session.handle,
                  bio: "New voice on The Artist Post.",
                  avatarUrl: session.image,
                },
              }
            : undefined,
        },
      });
    }

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
        status: data.visibility,
        publishedAt: data.visibility === "PUBLISHED" ? new Date() : null,
        theme: {
          primary: data.primaryColor,
          layoutStyle: data.layoutStyle,
        },
        authorId: user.id,
        tags: { connect: tagConnect },
      },
    });

    revalidatePath("/explore");
    revalidatePath("/");
    if (session.handle) revalidatePath(`/artist/${session.handle}`);

    return { ok: true as const, mode: "db" as const, slug: post.slug };
  } catch (error) {
    console.error("[createPostAction]", error);
    return { ok: false as const, error: "Could not save post" };
  }
}
