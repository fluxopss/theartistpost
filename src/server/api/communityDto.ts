import type {
  ArtistProfile,
  CommunityKind,
  CommunityPost,
  Prisma,
  Topic,
  User,
} from "@prisma/client";
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
  supportCount: number;
  replyCount: number;
  viewerSupported: boolean;
  canDelete: boolean;
  createdAt: string;
};

export type Viewer = { id: string; role: "VIEWER" | "ARTIST" | "ADMIN" } | null;

export type CommunityPostRow = CommunityPost & {
  author: User & { artistProfile: ArtistProfile | null };
  topic: Topic | null;
  _count: { reactions: number; replies: number };
  reactions?: Array<{ userId: string }>;
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
      ? { reactions: { where: { userId: viewerId }, select: { userId: true } } }
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
): CommunityPostDTO {
  const artist = row.author.artistProfile;
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
    supportCount: row._count.reactions,
    replyCount: row._count.replies,
    viewerSupported: (row.reactions?.length ?? 0) > 0,
    canDelete: viewer
      ? viewer.role === "ADMIN" || row.authorId === viewer.id
      : false,
    createdAt: row.createdAt.toISOString(),
  };
}
