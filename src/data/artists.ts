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

/** Placeholder featured artists — swap when showcases go live. */
export const artists: Artist[] = [
  {
    id: "1",
    name: "Coming Soon",
    medium: "visual",
    bio: "Featured local visual artists will appear here as Hacienda showcases go live.",
    image: "/brand/coming-soon.jpg",
    comingSoon: true,
  },
  {
    id: "2",
    name: "Coming Soon",
    medium: "music",
    bio: "Live music and sound artists from the West Palm Beach community.",
    image: "/brand/cover.jpg",
    comingSoon: true,
  },
  {
    id: "3",
    name: "Coming Soon",
    medium: "theater",
    bio: "Stage and performance talent connected through The Artist Post.",
    image: "/brand/about-hero.png",
    comingSoon: true,
  },
  {
    id: "4",
    name: "Coming Soon",
    medium: "dance",
    bio: "Movement and dance creatives — schedule TBD.",
    image: "/brand/hacienda.png",
    comingSoon: true,
  },
  {
    id: "5",
    name: "Coming Soon",
    medium: "literary",
    bio: "Writers and spoken-word artists joining the hub.",
    image: "/merch/gallery.jpeg",
    comingSoon: true,
  },
  {
    id: "6",
    name: "Coming Soon",
    medium: "multidisciplinary",
    bio: "Cross-medium collaborations and pop-up activations.",
    image: "/merch/tap-merch-site.jpg",
    comingSoon: true,
  },
];
