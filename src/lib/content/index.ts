import { seedAdapter } from "./adapters/seed";
import { supabaseAdapter } from "./adapters/supabase";
import type { ContentAdapter } from "./schemas";

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
