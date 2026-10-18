/**
 * Unsaved profile edits kept in this browser, so a failed save or an expired
 * session never throws away what someone typed (the app does the same).
 * Every storage call is guarded: private windows and blocked storage just
 * mean no draft, never a crash.
 */
export type ProfileDraft = {
  name: string;
  headline: string;
  bio: string;
  location: string;
  chapterId: string | null;
  topicSlugs: string[];
  venmoUsername: string;
  cashAppTag: string;
  paypalMeUsername: string;
};

const key = (userId: string) => `tap:profile-draft:${userId}`;

const STRING_FIELDS = ["name", "headline", "bio", "location", "venmoUsername", "cashAppTag", "paypalMeUsername"] as const;

function isDraft(value: unknown): value is ProfileDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    STRING_FIELDS.every((field) => typeof v[field] === "string") &&
    (v.chapterId === null || typeof v.chapterId === "string") &&
    Array.isArray(v.topicSlugs) &&
    v.topicSlugs.every((slug) => typeof slug === "string")
  );
}

export function saveDraft(userId: string, draft: ProfileDraft): void {
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(draft));
  } catch {
    // Storage blocked: nothing to keep.
  }
}

export function loadDraft(userId: string): ProfileDraft | null {
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(userId: string): void {
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    // Storage blocked: nothing to clear.
  }
}
