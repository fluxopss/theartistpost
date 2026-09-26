"use server";

export type CreatePostInput = {
  title: string;
  tags?: string[];
  visibility?: "DRAFT" | "PUBLISHED";
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "EMBED" | "CANVAS";
  description?: string;
  primaryColor?: string;
  layoutStyle?: "framed" | "bleed" | "stack" | "orbit";
};

export type CreatePostResult =
  | { ok: false; error: string }
  | { ok: true; mode: "db" | "fixture"; slug: string; message?: string };

export const PUBLISHING_CLOSED_ERROR =
  "Publishing is closed until an artist is approved.";

export async function createPostAction(
  raw: CreatePostInput,
): Promise<CreatePostResult> {
  // Trust lock: refuse all public creates before session, user, or post writes.
  void raw;
  return { ok: false, error: PUBLISHING_CLOSED_ERROR };
}
