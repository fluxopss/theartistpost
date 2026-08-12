import type { ContentArtist } from "@/lib/content";

export function filterArtists(
  artists: ContentArtist[],
  query: string,
  medium: ContentArtist["medium"] | "all",
): ContentArtist[] {
  const q = query.trim().toLowerCase();
  return artists.filter((a) => {
    const mediumOk = medium === "all" || a.medium === medium;
    const queryOk =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.medium.toLowerCase().includes(q) ||
      a.bio.toLowerCase().includes(q);
    return mediumOk && queryOk;
  });
}
