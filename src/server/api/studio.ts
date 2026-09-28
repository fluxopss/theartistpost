import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  authorizePublisher,
  resolvePostStatus,
} from "@/features/auth/publishGate";
import type { DbUserWithProfile } from "@/features/auth/sessionUser";
import type { SessionUser } from "@/features/auth/types";
import { writeAuditLog } from "@/features/posts/audit";
import { absoluteUrl } from "@/server/api/urls";

export const createStudioPostSchema = z.object({
  title: z.string().trim().min(2).max(120),
  /** Caption shown on the wall (maps to Post.description). */
  caption: z.string().trim().max(4000).optional(),
  description: z.string().trim().max(4000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  visibility: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  mediaUrl: z
    .string()
    .trim()
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
});

export type CreateStudioPostInput = z.infer<typeof createStudioPostSchema>;

export type StudioPostDTO = {
  id: string;
  slug: string;
  title: string;
  caption: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  media: { url: string | null; type: "IMAGE" | "VIDEO" | "EMBED" | "CANVAS" };
  tags: Array<{ slug: string; name: string }>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function toStudioPostDTO(post: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  mediaUrl: string | null;
  mediaType: "IMAGE" | "VIDEO" | "EMBED" | "CANVAS";
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: Array<{ slug: string; name: string }>;
}): StudioPostDTO {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    caption: post.description ?? null,
    status: post.status,
    media: {
      url: absoluteUrl(post.mediaUrl),
      type: post.mediaType,
    },
    tags: post.tags.map((t) => ({ slug: t.slug, name: t.name })),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export type CreateStudioPostResult =
  | { ok: true; post: StudioPostDTO }
  | { ok: false; error: string; code: "forbidden" | "unavailable" };

export async function createStudioPost(
  prisma: PrismaClient,
  session: SessionUser,
  dbUser: DbUserWithProfile,
  raw: CreateStudioPostInput,
): Promise<CreateStudioPostResult> {
  const gate = authorizePublisher(session, dbUser);
  if (!gate.ok) {
    return { ok: false, error: gate.error, code: "forbidden" };
  }

  const status = resolvePostStatus(raw.visibility, gate.canPublish);
  const caption = raw.caption ?? raw.description ?? undefined;
  const slugBase = slugify(raw.title) || "untitled";
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  try {
    const tagConnect = [];
    for (const name of raw.tags) {
      const tagSlug = slugify(name);
      if (!tagSlug) continue;
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        create: { name, slug: tagSlug },
        update: {},
      });
      tagConnect.push({ id: tag.id });
    }

    const post = await prisma.post.create({
      data: {
        title: raw.title,
        slug,
        description: caption,
        mediaUrl: raw.mediaUrl || null,
        mediaType: raw.mediaType,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        authorId: dbUser.id,
        tags: { connect: tagConnect },
      },
      include: { tags: true },
    });

    await writeAuditLog(prisma, {
      actorId: dbUser.id,
      action: status === "PUBLISHED" ? "post.publish" : "post.create_draft",
      targetType: "Post",
      targetId: post.id,
      meta: { slug: post.slug, status, via: "api/v1/studio" },
    });

    return { ok: true, post: toStudioPostDTO(post) };
  } catch (error) {
    console.error("[createStudioPost]", error);
    return {
      ok: false,
      error: "Could not save post",
      code: "unavailable",
    };
  }
}

export type ListStudioPostsQuery = {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "ALL";
  cursor?: string;
  take: number;
};

export async function listStudioPosts(
  prisma: PrismaClient,
  authorId: string,
  query: ListStudioPostsQuery,
): Promise<{ items: StudioPostDTO[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(query.take, 1), 50);
  const statusFilter =
    !query.status || query.status === "ALL"
      ? undefined
      : { status: query.status };

  const rows = await prisma.post.findMany({
    where: {
      authorId,
      ...statusFilter,
    },
    include: { tags: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(query.cursor
      ? {
          cursor: { id: query.cursor },
          skip: 1,
        }
      : {}),
  });

  const page = rows.slice(0, take);
  const nextCursor = rows.length > take ? page[page.length - 1]?.id ?? null : null;

  return {
    items: page.map(toStudioPostDTO),
    nextCursor,
  };
}
