import type { PaymentLink } from "@/server/api/paymentLinks";

export type Role = "VIEWER" | "ARTIST" | "ADMIN";
export type MediaType = "IMAGE" | "VIDEO" | "EMBED" | "CANVAS";
export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type LayoutStyle = "framed" | "bleed" | "stack" | "orbit";

export interface PostTheme {
  primary?: string;
  secondary?: string;
  layoutStyle?: LayoutStyle;
}

export interface SocialLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
  behance?: string;
}

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
}

export interface ArtistSummary {
  id: string;
  handle: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  socialLinks?: SocialLinks | null;
  /** Link-out payment usernames, built server-side; omitted = none. */
  paymentLinks?: PaymentLink[];
}

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  mediaUrl?: string | null;
  mediaType: MediaType;
  theme?: PostTheme | null;
  featured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt?: string | null;
  tags: TagSummary[];
  artist: ArtistSummary;
}

export interface CommentView {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image?: string | null;
    /** Community handle (User.handle), falling back to the artist handle. */
    handle?: string | null;
  };
}

export interface PostDetail extends PostSummary {
  status: PostStatus;
  /** Author's User.id — used to honor blocks; never put on the wire. */
  authorId?: string;
  comments: CommentView[];
}

export interface ArtistDetail extends ArtistSummary {
  posts: PostSummary[];
  /** Published works in the public catalog (may exceed `posts.length` when paginated). */
  postCount: number;
}

export interface ArtistProfileOnly extends ArtistSummary {
  postCount: number;
}
