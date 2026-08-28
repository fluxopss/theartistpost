export const STUDIO_KEY = "tap-studio";
export const LIKES_KEY = "tap-likes";
export const SAVES_KEY = "tap-saves";
export const COMMENTS_KEY = "tap-comments";
export const ONBOARD_KEY = "tap-onboarded";
export const INSTALL_DISMISS_KEY = "tap-install-dismissed";
export const MOTION_KEY = "tap-motion";

export type StudioProfile = {
  displayName: string;
  handle: string;
  city?: string;
};

export type SavedPost = {
  id: string;
  slug: string;
  title: string;
  artist: string;
};

export type SavedEvent = {
  id: string;
  title: string;
  venue: string;
  start: string;
};

export type SavedLibrary = {
  posts: SavedPost[];
  events: SavedEvent[];
};

export type LocalComment = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

export const DEFAULT_STUDIO: StudioProfile = {
  displayName: "Studio Guest",
  handle: "studioguest",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function slugifyHandle(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return slug || DEFAULT_STUDIO.handle;
}

export function getStudio(): StudioProfile {
  const stored = readJson<Partial<StudioProfile> | null>(STUDIO_KEY, null);
  if (!stored?.displayName?.trim()) return { ...DEFAULT_STUDIO };
  return {
    displayName: stored.displayName.trim().slice(0, 40),
    handle: stored.handle?.trim() || slugifyHandle(stored.displayName),
    city: stored.city?.trim() || undefined,
  };
}

export function setStudio(next: Partial<StudioProfile>): StudioProfile {
  const current = getStudio();
  const displayName = (next.displayName ?? current.displayName)
    .trim()
    .slice(0, 40);
  const profile: StudioProfile = {
    displayName: displayName || DEFAULT_STUDIO.displayName,
    handle: slugifyHandle(next.handle ?? displayName),
    city: (next.city ?? current.city)?.trim() || undefined,
  };
  writeJson(STUDIO_KEY, profile);
  return profile;
}

export function getLikedIds(): string[] {
  return readJson<string[]>(LIKES_KEY, []);
}

export function isLiked(id: string): boolean {
  return getLikedIds().includes(id);
}

export function toggleLike(id: string): boolean {
  const ids = new Set(getLikedIds());
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  writeJson(LIKES_KEY, [...ids]);
  return ids.has(id);
}

export function getSaves(): SavedLibrary {
  const stored = readJson<Partial<SavedLibrary>>(SAVES_KEY, {
    posts: [],
    events: [],
  });
  return {
    posts: Array.isArray(stored.posts) ? stored.posts : [],
    events: Array.isArray(stored.events) ? stored.events : [],
  };
}

export function isPostSaved(id: string): boolean {
  return getSaves().posts.some((post) => post.id === id);
}

export function isEventSaved(id: string): boolean {
  return getSaves().events.some((event) => event.id === id);
}

export function toggleSavedPost(post: SavedPost): boolean {
  const library = getSaves();
  const exists = library.posts.some((item) => item.id === post.id);
  library.posts = exists
    ? library.posts.filter((item) => item.id !== post.id)
    : [post, ...library.posts];
  writeJson(SAVES_KEY, library);
  return !exists;
}

export function toggleSavedEvent(event: SavedEvent): boolean {
  const library = getSaves();
  const exists = library.events.some((item) => item.id === event.id);
  library.events = exists
    ? library.events.filter((item) => item.id !== event.id)
    : [event, ...library.events];
  writeJson(SAVES_KEY, library);
  return !exists;
}

export function getComments(postId: string): LocalComment[] {
  const all = readJson<Record<string, LocalComment[]>>(COMMENTS_KEY, {});
  return all[postId] ?? [];
}

export function addComment(
  postId: string,
  body: string,
  author: string,
): LocalComment | { error: string } {
  const text = body.trim();
  if (text.length < 2) return { error: "Write a short note first." };
  if (text.length > 280) return { error: "Keep it under 280 characters." };
  const comment: LocalComment = {
    id: `local-${Date.now()}`,
    body: text,
    author: author.trim() || DEFAULT_STUDIO.displayName,
    createdAt: new Date().toISOString(),
  };
  const all = readJson<Record<string, LocalComment[]>>(COMMENTS_KEY, {});
  all[postId] = [...(all[postId] ?? []), comment];
  writeJson(COMMENTS_KEY, all);
  return comment;
}

export function isOnboarded(): boolean {
  return readJson<boolean>(ONBOARD_KEY, false) === true;
}

export function markOnboarded() {
  writeJson(ONBOARD_KEY, true);
}

export function getInstallDismissedAt(): number | null {
  const value = readJson<number | null>(INSTALL_DISMISS_KEY, null);
  return typeof value === "number" ? value : null;
}

export function dismissInstall() {
  writeJson(INSTALL_DISMISS_KEY, Date.now());
}

export type MotionPreference = "system" | "reduce";

export function getMotionPreference(): MotionPreference {
  return readJson<MotionPreference>(MOTION_KEY, "system") === "reduce"
    ? "reduce"
    : "system";
}

export function setMotionPreference(value: MotionPreference) {
  writeJson(MOTION_KEY, value);
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", value === "reduce");
}

export function applyMotionPreference() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(
    "reduce-motion",
    getMotionPreference() === "reduce",
  );
}

export function clearLocalAppData() {
  if (!canUseStorage()) return;
  [
    STUDIO_KEY,
    LIKES_KEY,
    SAVES_KEY,
    COMMENTS_KEY,
    ONBOARD_KEY,
    INSTALL_DISMISS_KEY,
    MOTION_KEY,
  ].forEach((key) => localStorage.removeItem(key));
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("reduce-motion");
  }
}
