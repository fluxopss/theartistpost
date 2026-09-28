import type { Post, Prisma, Tag, User, ArtistProfile } from "@prisma/client";
import { assets } from "@/content/site";
import { POSTS_MAX_TAKE, POSTS_PAGE_SIZE } from "@/shared/lib/constants";
import { getPrisma } from "@/shared/lib/prisma";
import {
  isDeniedAuthorEmail,
  isDeniedPostSlug,
  publicCatalogWhere,
} from "@/features/posts/denylist";
import type {
  ArtistDetail,
  ArtistProfileOnly,
  PostDetail,
  PostSummary,
  PostTheme,
  SocialLinks,
  TagSummary,
} from "@/features/posts/types";

type PostWithRelations = Post & {
  author: User & { artistProfile: ArtistProfile | null };
  tags: Tag[];
  _count: { likes: number; comments: number };
  comments?: Array<{
    id: string;
    body: string;
    createdAt: Date;
    user: { id: string; name: string; image: string | null };
  }>;
};

function mapArtist(
  author: User & { artistProfile: ArtistProfile | null },
): PostSummary["artist"] {
  return {
    id: author.artistProfile?.id ?? author.id,
    handle: author.artistProfile?.handle ?? "unknown",
    name: author.name,
    bio: author.artistProfile?.bio,
    avatarUrl: sanitizeAvatarUrl(
      author.artistProfile?.avatarUrl ?? author.image,
    ),
    socialLinks:
      (author.artistProfile?.socialLinks as SocialLinks | null) ?? null,
  };
}

function mapPostSummary(post: PostWithRelations): PostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    mediaUrl: sanitizeMediaUrl(post.mediaUrl),
    mediaType: post.mediaType,
    theme: (post.theme as PostTheme | null) ?? null,
    featured: post.featured,
    viewCount: post.viewCount,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    tags: post.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    artist: mapArtist(post.author),
  };
}

function isStockPlaceholder(url: string) {
  return (
    url.includes("images.unsplash.com") || url.includes("img1.wsimg.com")
  );
}

function sanitizeMediaUrl(url: string | null): string | null {
  if (!url) return url;
  return isStockPlaceholder(url) ? assets.comingSoon : url;
}

function sanitizeAvatarUrl(url: string | null): string | null {
  if (!url) return url;
  return isStockPlaceholder(url) ? assets.logo : url;
}

function mapPostDetail(post: PostWithRelations): PostDetail {
  return {
    ...mapPostSummary(post),
    status: post.status,
    comments:
      post.comments?.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: {
          id: c.user.id,
          name: c.user.name,
          image: sanitizeAvatarUrl(c.user.image),
        },
      })) ?? [],
  };
}

async function withDb<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  const prisma = getPrisma();
  if (!prisma) return fallback();
  try {
    return await fn();
  } catch (error) {
    console.error("[posts.withDb]", error);
    return fallback();
  }
}

export async function getFeaturedPosts(limit = 4): Promise<PostSummary[]> {
  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const posts = await prisma.post.findMany({
        where: { ...publicCatalogWhere(), featured: true },
        orderBy: { publishedAt: "desc" },
        take: limit,
        include: {
          author: { include: { artistProfile: true } },
          tags: true,
          _count: { select: { likes: true, comments: true } },
        },
      });
      return posts.map(mapPostSummary);
    },
    () => [],
  );
}

/** Whole number of posts per page, between 1 and POSTS_MAX_TAKE. */
export function clampPostsTake(take: number | undefined): number {
  if (take === undefined || !Number.isFinite(take)) return POSTS_PAGE_SIZE;
  return Math.min(POSTS_MAX_TAKE, Math.max(1, Math.trunc(take)));
}

export async function getPosts(options?: {
  cursor?: string;
  take?: number;
  tag?: string;
}): Promise<{ items: PostSummary[]; nextCursor: string | null }> {
  const take = clampPostsTake(options?.take);

  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const where: Prisma.PostWhereInput = {
        ...publicCatalogWhere(),
        ...(options?.tag ? { tags: { some: { slug: options.tag } } } : {}),
      };

      const posts = await prisma.post.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: take + 1,
        ...(options?.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
        include: {
          author: { include: { artistProfile: true } },
          tags: true,
          _count: { select: { likes: true, comments: true } },
        },
      });

      const hasMore = posts.length > take;
      const slice = hasMore ? posts.slice(0, take) : posts;
      return {
        items: slice.map(mapPostSummary),
        nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
      };
    },
    () => ({ items: [], nextCursor: null }),
  );
}

export async function getPostBySlug(
  slug: string,
  options?: {
    /** Oldest first by default (the post page reads top to bottom). */
    commentOrder?: "asc" | "desc";
    /** Omit to load every comment. */
    commentTake?: number;
  },
): Promise<PostDetail | null> {
  if (isDeniedPostSlug(slug)) return null;

  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const post = await prisma.post.findFirst({
        where: {
          ...publicCatalogWhere(),
          slug,
        },
        include: {
          author: { include: { artistProfile: true } },
          tags: true,
          _count: { select: { likes: true, comments: true } },
          comments: {
            orderBy: { createdAt: options?.commentOrder ?? "asc" },
            ...(options?.commentTake !== undefined
              ? { take: options.commentTake }
              : {}),
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
      });
      if (!post) return null;
      if (isDeniedAuthorEmail(post.author.email)) return null;
      return mapPostDetail(post);
    },
    () => null,
  );
}

const artistPostInclude = {
  author: { include: { artistProfile: true } },
  tags: true,
  _count: { select: { likes: true, comments: true } },
} as const;

function mapArtistProfile(
  profile: ArtistProfile & { user: User },
  postCount: number,
): ArtistProfileOnly {
  return {
    id: profile.id,
    handle: profile.handle,
    name: profile.user.name,
    bio: profile.bio,
    avatarUrl: sanitizeAvatarUrl(profile.avatarUrl ?? profile.user.image),
    socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
    postCount,
  };
}

/**
 * Approved public artist profile (no posts). Unknown, unapproved, or denied
 * authors are null — same gate as the profile page.
 */
export async function getArtistProfileByHandle(
  handle: string,
): Promise<ArtistProfileOnly | null> {
  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const profile = await prisma.artistProfile.findUnique({
        where: { handle },
        include: { user: true },
      });
      if (!profile?.approved) return null;
      if (isDeniedAuthorEmail(profile.user.email)) return null;

      const postCount = await prisma.post.count({
        where: {
          ...publicCatalogWhere(),
          authorId: profile.userId,
        },
      });

      return mapArtistProfile(profile, postCount);
    },
    () => null,
  );
}

/**
 * Chronological published works for an approved artist.
 * Same catalog filter as the Wall; `nextCursor` is the last item's id.
 */
export async function getArtistTimeline(
  handle: string,
  options?: { cursor?: string; take?: number },
): Promise<{
  artist: ArtistProfileOnly;
  items: PostSummary[];
  nextCursor: string | null;
} | null> {
  const take = clampPostsTake(options?.take);

  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const profile = await prisma.artistProfile.findUnique({
        where: { handle },
        include: { user: true },
      });
      if (!profile?.approved) return null;
      if (isDeniedAuthorEmail(profile.user.email)) return null;

      const where: Prisma.PostWhereInput = {
        ...publicCatalogWhere(),
        authorId: profile.userId,
      };

      const [postCount, posts] = await Promise.all([
        prisma.post.count({ where }),
        prisma.post.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          take: take + 1,
          ...(options?.cursor
            ? { skip: 1, cursor: { id: options.cursor } }
            : {}),
          include: artistPostInclude,
        }),
      ]);

      const hasMore = posts.length > take;
      const slice = hasMore ? posts.slice(0, take) : posts;
      return {
        artist: mapArtistProfile(profile, postCount),
        items: slice.map(mapPostSummary),
        nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
      };
    },
    () => null,
  );
}

/**
 * Profile + first page of works (defaults to a full page for the web SSR
 * artist page). Prefer `getArtistTimeline` for mobile infinite scroll.
 */
export async function getArtistByHandle(
  handle: string,
  options?: { take?: number; cursor?: string },
): Promise<ArtistDetail | null> {
  const page = await getArtistTimeline(handle, {
    take: options?.take ?? POSTS_MAX_TAKE,
    cursor: options?.cursor,
  });
  if (!page) return null;
  return {
    ...page.artist,
    posts: page.items,
  };
}

export async function getAllTags(): Promise<TagSummary[]> {
  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
      return tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
    },
    () => [],
  );
}
