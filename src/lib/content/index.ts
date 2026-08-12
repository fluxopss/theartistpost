import { seedAdapter } from "./adapters/seed";
import { supabaseAdapter } from "./adapters/supabase";
import type { ContentAdapter, ContentArtist } from "./schemas";

function resolveAdapter(): ContentAdapter {
  const mode = process.env.CONTENT_ADAPTER ?? "seed";
  if (mode === "supabase") return supabaseAdapter;
  return seedAdapter;
}

const adapter = resolveAdapter();

/** Framework-agnostic content service — pages/features call these helpers. */
export const content = {
  getArtists: () => adapter.getArtists(),
  getEvents: () => adapter.getEvents(),
  getEventById: (id: string) => adapter.getEventById(id),
  getWallNotes: () => adapter.getWallNotes(),
  getChapters: () => adapter.getChapters(),
};

export const ARTIST_MEDIUM_OPTIONS: {
  value: "all" | ContentArtist["medium"];
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "music", label: "Music" },
  { value: "theater", label: "Theater" },
  { value: "visual", label: "Visual" },
  { value: "dance", label: "Dance" },
  { value: "literary", label: "Literary" },
  { value: "multidisciplinary", label: "Multi" },
];

export type {
  ContentArtist,
  ContentEvent,
  ContentWallNote,
  ContentExplorePost,
  ContentChapter,
  ContentAdapter,
} from "./schemas";

export {
  artistSchema,
  eventSchema,
  wallNoteSchema,
  explorePostSchema,
  chapterSchema,
} from "./schemas";
