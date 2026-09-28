import type { ContentArtist, ContentChapter, ContentEvent } from "@/lib/content";
import { nightPhase, type NightPhase } from "@/features/night/program";
import type {
  ArtistSummary,
  MediaType,
  PostDetail,
  PostSummary,
  TagSummary,
} from "@/features/posts/types";
import { absoluteUrl, externalUrl } from "@/server/api/urls";

/** Wire shapes for /api/v1. Every URL in them is absolute. */

export type EventDTO = {
  id: string;
  title: string;
  artist: string;
  medium: string;
  start: string;
  end: string;
  venue: string;
  description: string;
  comingSoon: boolean;
  status: NightPhase;
};

export type TagDTO = { slug: string; name: string };

export type PostSummaryDTO = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  media: { url: string | null; type: MediaType };
  tags: TagDTO[];
  artist: { handle: string; name: string; avatarUrl: string | null };
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
};

export type CommentDTO = {
  id: string;
  body: string;
  author: { name: string };
  createdAt: string;
};

export type PostDetailDTO = PostSummaryDTO & { comments: CommentDTO[] };

export const SOCIAL_LINK_KEYS = [
  "website",
  "instagram",
  "twitter",
  "behance",
] as const;

export type SocialLinksDTO = Partial<
  Record<(typeof SOCIAL_LINK_KEYS)[number], string>
>;

export type ArtistProfileDTO = {
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  socialLinks: SocialLinksDTO;
};

export type ContentArtistDTO = {
  id: string;
  handle: string | null;
  name: string;
  medium: ContentArtist["medium"];
  bio: string;
  imageUrl: string | null;
  comingSoon: boolean;
};

export type ChapterDTO = {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  city: string | null;
  status: ContentChapter["status"];
  summary: string;
};

export function toEventDTO(event: ContentEvent, now = new Date()): EventDTO {
  return {
    id: event.id,
    title: event.title,
    artist: event.artist,
    medium: event.medium,
    start: event.start,
    end: event.end,
    venue: event.venue,
    description: event.description,
    comingSoon: event.comingSoon ?? false,
    status: nightPhase(event, now),
  };
}

/** Soonest first; unparseable dates sink to the end. */
export function byStartAscending(a: ContentEvent, b: ContentEvent): number {
  const ta = Date.parse(a.start);
  const tb = Date.parse(b.start);
  return (
    (Number.isNaN(ta) ? Infinity : ta) - (Number.isNaN(tb) ? Infinity : tb)
  );
}

function toTagDTO(tag: TagSummary): TagDTO {
  return { slug: tag.slug, name: tag.name };
}

export function toTagsDTO(tags: TagSummary[]): TagDTO[] {
  return tags.map(toTagDTO);
}

export function toPostSummaryDTO(post: PostSummary): PostSummaryDTO {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description ?? null,
    media: { url: absoluteUrl(post.mediaUrl), type: post.mediaType },
    tags: post.tags.map(toTagDTO),
    artist: {
      handle: post.artist.handle,
      name: post.artist.name,
      avatarUrl: absoluteUrl(post.artist.avatarUrl),
    },
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    publishedAt: post.publishedAt ?? null,
  };
}

export const POST_DETAIL_MAX_COMMENTS = 50;

/** Comments newest first, capped — whatever order the query returned. */
export function toPostDetailDTO(post: PostDetail): PostDetailDTO {
  const comments = [...post.comments]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, POST_DETAIL_MAX_COMMENTS)
    .map((c) => ({
      id: c.id,
      body: c.body,
      author: { name: c.author.name },
      createdAt: c.createdAt,
    }));
  return { ...toPostSummaryDTO(post), comments };
}

/**
 * Only known link fields holding absolute http(s) URLs. Anything else the
 * profile JSON carries (join notes, free text) stays off the wire.
 */
export function toSocialLinksDTO(raw: unknown): SocialLinksDTO {
  const links: SocialLinksDTO = {};
  if (typeof raw !== "object" || raw === null) return links;
  const record = raw as Record<string, unknown>;
  for (const key of SOCIAL_LINK_KEYS) {
    const url = externalUrl(record[key]);
    if (url) links[key] = url;
  }
  return links;
}

export function toArtistProfileDTO(artist: ArtistSummary): ArtistProfileDTO {
  return {
    handle: artist.handle,
    name: artist.name,
    bio: artist.bio ?? null,
    avatarUrl: absoluteUrl(artist.avatarUrl),
    socialLinks: toSocialLinksDTO(artist.socialLinks),
  };
}

export function toContentArtistDTO(artist: ContentArtist): ContentArtistDTO {
  return {
    id: artist.id,
    handle: artist.handle ?? null,
    name: artist.name,
    medium: artist.medium,
    bio: artist.bio,
    imageUrl: absoluteUrl(artist.image),
    comingSoon: artist.comingSoon ?? false,
  };
}

export function toChapterDTO(chapter: ContentChapter): ChapterDTO {
  return {
    id: chapter.id,
    name: chapter.name,
    state: chapter.state,
    stateCode: chapter.stateCode,
    city: chapter.city ?? null,
    status: chapter.status,
    summary: chapter.summary,
  };
}
