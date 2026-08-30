export type KindnessMedium =
  | "anyone"
  | "music"
  | "visual"
  | "theater"
  | "open-heart";

export type KindnessSpark = "coral" | "gold" | "teal";

export type KindnessPinKind = "house" | "wall" | "event" | "artist";

export type KindnessNote = {
  id: string;
  body: string;
  fromLabel: string;
  medium: KindnessMedium;
  spark: KindnessSpark;
  createdAt: string;
  source: "seed" | "local";
  pinKind?: KindnessPinKind;
  pinLabel?: string;
};

export type KindnessFilter = "all" | KindnessMedium;

export const KINDNESS_STORAGE_KEY = "tap-kindness-notes";
export const KINDNESS_MAX_BODY = 240;
export const KINDNESS_LOCAL_CAP = 50;
export const KINDNESS_ANON = "Anonymous artist";

export const MEDIUM_LABELS: Record<KindnessMedium, string> = {
  anyone: "Anyone",
  music: "Music",
  visual: "Visual",
  theater: "Theater",
  "open-heart": "Open heart",
};

export const FILTER_OPTIONS: { id: KindnessFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "anyone", label: "Anyone" },
  { id: "music", label: "Music" },
  { id: "visual", label: "Visual" },
  { id: "theater", label: "Theater" },
  { id: "open-heart", label: "Open heart" },
];

export const SPARK_LABELS: Record<KindnessSpark, string> = {
  coral: "Coral spark",
  gold: "Gold spark",
  teal: "Teal spark",
};

export const SPARK_HEX: Record<KindnessSpark, string> = {
  coral: "#ff6b5b",
  gold: "#f0b429",
  teal: "#2ec4b6",
};
