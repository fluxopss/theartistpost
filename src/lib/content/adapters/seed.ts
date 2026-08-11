import { artists } from "@/data/artists";
import { events } from "@/data/events";
import { kindnessSeeds } from "@/features/kindness/fixtures";
import type { ContentAdapter } from "../schemas";
import { chapters } from "../chapters.seed";

/**
 * Seed/mock adapter — uses existing in-repo content.
 * Swap via CONTENT_ADAPTER=supabase when ready.
 */
export const seedAdapter: ContentAdapter = {
  async getArtists() {
    return artists.map((a) => ({
      ...a,
      handle: a.id,
    }));
  },
  async getEvents() {
    return events;
  },
  async getEventById(id) {
    return events.find((e) => e.id === id) ?? null;
  },
  async getWallNotes() {
    return kindnessSeeds.map((n) => ({
      ...n,
      source: n.source === "seed" ? ("seed" as const) : ("local" as const),
    }));
  },
  async getChapters() {
    return chapters;
  },
};
