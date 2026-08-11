/**
 * Supabase adapter stub — wire when migrating off seed/Prisma fixtures.
 *
 * Suggested tables (public schema):
 * - artists (id, name, medium, bio, image_url, handle, coming_soon, created_at)
 * - events (id, title, artist, medium, start_at, end_at, venue, description, coming_soon)
 * - wall_notes (id, body, from_label, medium, spark, created_at, moderated, published)
 * - chapters (id, name, state, state_code, city, status, summary)
 * - explore_posts — can continue via Prisma or move to `posts`
 *
 * RLS notes (enable RLS on all public tables):
 * - SELECT: allow anon for published/public rows only
 *   e.g. wall_notes: `published = true AND moderated = true`
 * - INSERT wall_notes: anon allowed with check (body length, rate limit via Edge Function)
 * - INSERT/UPDATE artists, events, chapters: service role / authenticated admin only
 * - Never expose service role key to the browser
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=
 *   SUPABASE_SERVICE_ROLE_KEY= (server only)
 */

import type { ContentAdapter } from "../schemas";

export const supabaseAdapter: ContentAdapter = {
  async getArtists() {
    throw new Error(
      "Supabase adapter not configured. Set CONTENT_ADAPTER=seed or implement supabase queries.",
    );
  },
  async getEvents() {
    throw new Error("Supabase adapter not configured.");
  },
  async getEventById() {
    throw new Error("Supabase adapter not configured.");
  },
  async getWallNotes() {
    throw new Error("Supabase adapter not configured.");
  },
  async getChapters() {
    throw new Error("Supabase adapter not configured.");
  },
};

/** Row types for future generated Database typing */
export type SupabaseArtistRow = {
  id: string;
  name: string;
  medium: string;
  bio: string;
  image_url: string;
  handle: string | null;
  coming_soon: boolean;
  created_at: string;
};

export type SupabaseEventRow = {
  id: string;
  title: string;
  artist: string;
  medium: string;
  start_at: string;
  end_at: string;
  venue: string;
  description: string;
  coming_soon: boolean;
};

export type SupabaseWallNoteRow = {
  id: string;
  body: string;
  from_label: string;
  medium: string;
  spark: string;
  created_at: string;
  moderated: boolean;
  published: boolean;
};

export type SupabaseChapterRow = {
  id: string;
  name: string;
  state: string;
  state_code: string;
  city: string | null;
  status: "active" | "forming" | "planned";
  summary: string;
};
