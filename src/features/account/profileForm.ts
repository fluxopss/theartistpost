import type { MeDTO } from "@/server/api/meProfile";
import type { ProfileDraft } from "@/features/account/profileDraft";

/** Form state from the server's view of the signed-in person. */
export function draftFromMe(me: MeDTO): ProfileDraft {
  const u = me.user;
  return {
    name: u.name ?? "",
    handle: u.handle ?? "",
    headline: u.headline ?? "",
    bio: u.bio ?? "",
    location: u.location ?? "",
    chapterId: u.chapterId ?? null,
    topicSlugs: u.topics.map((t) => t.slug),
    venmoUsername: u.venmoUsername ?? "",
    cashAppTag: u.cashAppTag ?? "",
    paypalMeUsername: u.paypalMeUsername ?? "",
  };
}

const NULLABLE_TEXT = ["headline", "bio", "location", "venmoUsername", "cashAppTag", "paypalMeUsername"] as const;

export type ProfilePatch = Partial<{
  name: string;
  handle: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  chapterId: string | null;
  topicSlugs: string[];
  venmoUsername: string | null;
  cashAppTag: string | null;
  paypalMeUsername: string | null;
}>;

/** Only what changed, in the shape PATCH /api/v1/me accepts. Empty optional text clears (null). */
export function profilePatch(initial: ProfileDraft, draft: ProfileDraft): ProfilePatch {
  const patch: ProfilePatch = {};
  if (draft.name.trim() !== initial.name.trim()) patch.name = draft.name.trim();
  // A handle can be chosen or changed, never cleared (the API has no "no handle").
  const handle = draft.handle.trim().replace(/^@/, "");
  if (handle !== "" && handle !== initial.handle.trim()) patch.handle = handle;
  for (const field of NULLABLE_TEXT) {
    const next = draft[field].trim();
    if (next !== initial[field].trim()) patch[field] = next === "" ? null : next;
  }
  if (draft.chapterId !== initial.chapterId) patch.chapterId = draft.chapterId;
  const sameTopics =
    draft.topicSlugs.length === initial.topicSlugs.length &&
    draft.topicSlugs.every((slug) => initial.topicSlugs.includes(slug));
  if (!sameTopics) patch.topicSlugs = draft.topicSlugs;
  return patch;
}

export function hasChanges(initial: ProfileDraft, draft: ProfileDraft): boolean {
  return Object.keys(profilePatch(initial, draft)).length > 0;
}
