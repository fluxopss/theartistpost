/**
 * The original TAP stage.
 * Source: StartUp Beat, “Featured Startup Pitch: The Artist Post,” March 11, 2016.
 * Spring 2015 site; TAP App in alpha after a successful second Kickstarter.
 * Do not add genres that were not in that pitch.
 */

export const tapOrigin = {
  kicker: "The TAP stage",
  line: "Spring 2015. One house for every kind of artist. Posts were photographs, video, and sound — so the feed stayed art.",
  short: "Photographs, video, and sound.",
} as const;

export const tapMedia = [
  { id: "photo", label: "Photograph" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Sound" },
] as const;

export const tapGenres = [
  { id: "music", label: "Musicians", tilt: "-2.4deg", tone: "coral" },
  { id: "photo", label: "Photographers", tilt: "1.6deg", tone: "teal" },
  { id: "dance", label: "Dancers", tilt: "-1.2deg", tone: "gold" },
  { id: "film", label: "Filmmakers", tilt: "2.1deg", tone: "violet" },
  { id: "stage", label: "Actors", tilt: "-1.8deg", tone: "coral" },
  { id: "laugh", label: "Comedians", tilt: "1.4deg", tone: "gold" },
  { id: "frame", label: "Models", tilt: "-2deg", tone: "teal" },
] as const;

export type TapGenre = (typeof tapGenres)[number];
