import type { Post, Prisma, Tag, User, ArtistProfile } from "@prisma/client";
import { assets } from "@/content/site";
import { POSTS_PAGE_SIZE } from "@/shared/lib/constants";
import { getPrisma } from "@/shared/lib/prisma";
import { fixturePosts, toSummary } from "@/features/posts/fixtures";
import type {
  ArtistDetail,
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
  } catch {
    // DB unreachable — keep the playground alive with fixtures
    return fallback();
  }
}

export async function getFeaturedPosts(limit = 4): Promise<PostSummary[]> {
  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED", featured: true },
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
    () =>
      fixturePosts
        .filter((p) => p.featured)
        .slice(0, limit)
        .map(toSummary),
  );
}

export async function getPosts(options?: {
  cursor?: string;
  take?: number;
  tag?: string;
}): Promise<{ items: PostSummary[]; nextCursor: string | null }> {
  const take = options?.take ?? POSTS_PAGE_SIZE;

  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const where: Prisma.PostWhereInput = {
        status: "PUBLISHED",
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

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const post = await prisma.post.findUnique({
        where: { slug },
        include: {
          author: { include: { artistProfile: true } },
          tags: true,
          _count: { select: { likes: true, comments: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
      });
      return post ? mapPostDetail(post) : null;
    },
    () => null,
  );
}

export async function getArtistByHandle(
  handle: string,
): Promise<ArtistDetail | null> {
  return withDb(
    async () => {
      const prisma = getPrisma()!;
      const profile = await prisma.artistProfile.findUnique({
        where: { handle },
        include: {
          user: {
            include: {
              posts: {
                where: { status: "PUBLISHED" },
                orderBy: { publishedAt: "desc" },
                include: {
                  author: { include: { artistProfile: true } },
                  tags: true,
                  _count: { select: { likes: true, comments: true } },
                },
              },
            },
          },
        },
      });
      if (!profile) return null;
      return {
        id: profile.id,
        handle: profile.handle,
        name: profile.user.name,
        bio: profile.bio,
        avatarUrl: sanitizeAvatarUrl(profile.avatarUrl ?? profile.user.image),
        socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
        posts: profile.user.posts.map(mapPostSummary),
      };
    },
    () => null,
  );
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
