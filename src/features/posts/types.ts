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
  };
}

export interface PostDetail extends PostSummary {
  status: PostStatus;
  comments: CommentView[];
}

export interface ArtistDetail extends ArtistSummary {
  posts: PostSummary[];
}
