import type {
  ArtistProfile,
  CommunityKind,
  CommunityPost,
  Prisma,
  Reaction,
  Topic,
  User,
} from "@prisma/client";
import {
  emptyReactionCounts,
  totalReactions,
  type ReactionCounts,
} from "@/server/api/reactions";
import { DENIED_AUTHOR_EMAILS } from "@/features/posts/denylist";
import { toTopicDTO, type TopicDTO } from "@/server/api/topics";
import { absoluteUrl } from "@/server/api/urls";

export type CommunityPostDTO = {
  id: string;
  kind: CommunityKind;
  body: string;
  imageUrl: string | null;
  topic: TopicDTO | null;
  parentId: string | null;
  author: {
    handle: string;
    name: string;
    avatarUrl: string | null;
    isArtist: boolean;
  };
  /** Total reactions of any kind (named for the original Support-only build). */
  supportCount: number;
  replyCount: number;
  /** True when the viewer has reacted with anything. */
  viewerSupported: boolean;
  /** Per-emoji counts, every key present. */
  reactionCounts: ReactionCounts;
  /** The viewer's one reaction on this post, or null. */
  viewerReaction: Reaction | null;
  canDelete: boolean;
  createdAt: string;
};

export type PersonSummaryDTO = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  isArtist: boolean;
  viewerFollows: boolean;
};

export type PersonRow = User & { artistProfile: ArtistProfile | null };

/** `isArtist` means an APPROVED artist (the badge people see). */
export function toPersonSummaryDTO(
  user: PersonRow,
  viewerFollows: boolean,
): PersonSummaryDTO {
  const artist = user.artistProfile;
  return {
    id: user.id,
    handle: user.handle ?? "",
    name: user.name,
    avatarUrl: absoluteUrl(artist?.avatarUrl ?? user.image),
    headline: user.headline ?? null,
    isArtist: artist?.approved === true,
    viewerFollows,
  };
}

export type Viewer = { id: string; role: "VIEWER" | "ARTIST" | "ADMIN" } | null;

export type CommunityPostRow = CommunityPost & {
  author: User & { artistProfile: ArtistProfile | null };
  topic: Topic | null;
  _count: { reactions: number; replies: number };
  reactions?: Array<{ userId: string; reaction?: Reaction }>;
};

/**
 * Include block for every community read: author + topic + support count +
 * VISIBLE reply count (hidden replies and replies by blocked people are not
 * counted) + whether the viewer supported it.
 */
export function communityPostInclude(
  viewerId: string | null,
  blockedIds: Iterable<string> = [],
) {
  const blocked = [...blockedIds];
  return {
    author: { include: { artistProfile: true } },
    topic: true,
    _count: {
      select: {
        reactions: true,
        replies: {
          where: {
            hiddenAt: null,
            ...(blocked.length > 0 ? { authorId: { notIn: blocked } } : {}),
          },
        },
      },
    },
    ...(viewerId
      ? {
          reactions: {
            where: { userId: viewerId },
            select: { userId: true, reaction: true },
          },
        }
      : {}),
  } satisfies Prisma.CommunityPostInclude;
}

/** Visibility every public read of community content shares. */
export function communityVisibleWhere(
  blockedIds: Iterable<string> = [],
): Prisma.CommunityPostWhereInput {
  const blocked = [...blockedIds];
  return {
    hiddenAt: null,
    author: {
      email: { notIn: [...DENIED_AUTHOR_EMAILS] },
      ...(blocked.length > 0 ? { id: { notIn: blocked } } : {}),
    },
  };
}

export function toCommunityPostDTO(
  row: CommunityPostRow,
  viewer: Viewer,
  counts?: ReactionCounts,
): CommunityPostDTO {
  const artist = row.author.artistProfile;
  // Without the grouped read (older call sites), fall back to the plain count.
  const reactionCounts =
    counts ??
    ({ ...emptyReactionCounts(), SUPPORT: row._count.reactions } as ReactionCounts);
  const mine = row.reactions?.[0];
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    imageUrl: absoluteUrl(row.imageUrl),
    topic: row.topic ? toTopicDTO(row.topic) : null,
    parentId: row.parentId ?? null,
    author: {
      handle: row.author.handle ?? "unknown",
      name: row.author.name,
      avatarUrl: absoluteUrl(artist?.avatarUrl ?? row.author.image),
      isArtist: artist?.approved === true,
    },
    supportCount: counts ? totalReactions(counts) : row._count.reactions,
    replyCount: row._count.replies,
    viewerSupported: mine !== undefined,
    reactionCounts,
    viewerReaction: mine ? (mine.reaction ?? "SUPPORT") : null,
    canDelete: viewer
      ? viewer.role === "ADMIN" || row.authorId === viewer.id
      : false,
    createdAt: row.createdAt.toISOString(),
  };
}
