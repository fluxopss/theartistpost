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

/**
 * Lanes the founder has added since the 2016 pitch. `tapGenres` stays the
 * historical record; `houseGenres` is what the house runs on today.
 *
 * Culinary Arts — Robbie Alvarez, Founder's Vision (Oct 2026): a primary
 * category, not an afterthought. In years of TAP pop-ups, at times roughly
 * half the vendors worked in food: food trucks, chefs, bakers, specialty food
 * makers. Listed right after Musicians on purpose.
 */
export const culinaryGenre = {
  id: "culinary",
  label: "Culinary Artists",
  tilt: "1.8deg",
  tone: "violet",
} as const;

export const houseGenres = [tapGenres[0], culinaryGenre, ...tapGenres.slice(1)] as const;

export type HouseGenre = (typeof houseGenres)[number];
