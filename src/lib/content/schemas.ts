import { z } from "zod";

export const artistMediumSchema = z.enum([
  "music",
  "theater",
  "visual",
  "dance",
  "literary",
  "multidisciplinary",
]);

export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  medium: artistMediumSchema,
  bio: z.string(),
  image: z.string(),
  handle: z.string().optional(),
  comingSoon: z.boolean().optional(),
});

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  medium: z.string(),
  start: z.string(),
  end: z.string(),
  venue: z.string(),
  description: z.string(),
  comingSoon: z.boolean().optional(),
});

export const wallNoteSchema = z.object({
  id: z.string(),
  body: z.string().max(240),
  fromLabel: z.string(),
  medium: z.enum(["anyone", "music", "visual", "theater", "open-heart"]),
  spark: z.enum(["coral", "gold", "teal"]),
  createdAt: z.string(),
  source: z.enum(["seed", "local", "remote"]),
});

export const explorePostSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "EMBED", "CANVAS"]),
  featured: z.boolean(),
  publishedAt: z.string().nullable().optional(),
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  artist: z.object({
    id: z.string(),
    handle: z.string(),
    name: z.string(),
  }),
});

export const chapterSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  stateCode: z.string().length(2),
  city: z.string().optional(),
  status: z.enum(["active", "forming", "planned"]),
  summary: z.string(),
});

export type ContentArtist = z.infer<typeof artistSchema>;
export type ContentEvent = z.infer<typeof eventSchema>;
export type ContentWallNote = z.infer<typeof wallNoteSchema>;
export type ContentExplorePost = z.infer<typeof explorePostSchema>;
export type ContentChapter = z.infer<typeof chapterSchema>;

export type ContentAdapter = {
  getArtists: () => Promise<ContentArtist[]>;
  getEvents: () => Promise<ContentEvent[]>;
  getEventById: (id: string) => Promise<ContentEvent | null>;
  getWallNotes: () => Promise<ContentWallNote[]>;
  getChapters: () => Promise<ContentChapter[]>;
};
