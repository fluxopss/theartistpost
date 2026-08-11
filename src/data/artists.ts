export type ArtistMedium =
  | "music"
  | "theater"
  | "visual"
  | "dance"
  | "literary"
  | "multidisciplinary";

export type Artist = {
  id: string;
  name: string;
  medium: ArtistMedium;
  bio: string;
  image: string;
  handle?: string;
  comingSoon?: boolean;
};

export const ARTIST_MEDIUMS: { value: ArtistMedium | "all"; label: string }[] =
  [
    { value: "all", label: "All" },
    { value: "music", label: "Music" },
    { value: "theater", label: "Theater" },
    { value: "visual", label: "Visual" },
    { value: "dance", label: "Dance" },
    { value: "literary", label: "Literary" },
    { value: "multidisciplinary", label: "Multi" },
  ];

/**
 * Featured artists — empty until the nonprofit supplies real showcase data.
 * Do not invent names or bios. Wire via content service / CMS when ready.
 */
export const artists: Artist[] = [];
