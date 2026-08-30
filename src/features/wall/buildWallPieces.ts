import { assets } from "@/content/site";
import type { ContentArtist, ContentEvent } from "@/lib/content";
import type { KindnessNote } from "@/features/kindness/types";
import type { ArtistMedium } from "@/data/artists";
import type { WallPiece } from "./types";
import { WALL_CANVAS } from "./types";

const RESERVED_SLOTS: Array<{
  id: string;
  medium: ArtistMedium;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
}> = [
  { id: "reserved-visual", medium: "visual", x: 180, y: 220, w: 320, h: 420, rotate: -1.4 },
  { id: "reserved-music", medium: "music", x: 2280, y: 200, w: 300, h: 400, rotate: 1.8 },
  { id: "reserved-theater", medium: "theater", x: 160, y: 1080, w: 280, h: 360, rotate: 0.8 },
  { id: "reserved-multi", medium: "multidisciplinary", x: 2320, y: 1100, w: 280, h: 380, rotate: -1.1 },
  { id: "reserved-dance", medium: "dance", x: 1080, y: 1380, w: 240, h: 260, rotate: 2.2 },
  { id: "reserved-literary", medium: "literary", x: 1480, y: 1400, w: 240, h: 250, rotate: -1.6 },
];

const ARTIST_SLOTS = [
  { x: 520, y: 180, w: 300, h: 400, rotate: -0.6 },
  { x: 1980, y: 160, w: 280, h: 380, rotate: 1.2 },
  { x: 500, y: 1120, w: 280, h: 360, rotate: 0.4 },
  { x: 2000, y: 1140, w: 270, h: 350, rotate: -0.9 },
];

function mediumLabel(medium: ArtistMedium | "community" | "kindness"): string {
  switch (medium) {
    case "music":
      return "Music";
    case "theater":
      return "Theater";
    case "visual":
      return "Visual";
    case "dance":
      return "Dance";
    case "literary":
      return "Literary";
    case "multidisciplinary":
      return "Many mediums";
    case "community":
      return "Community";
    case "kindness":
      return "Kindness";
    default: {
      const _exhaustive: never = medium;
      return _exhaustive;
    }
  }
}

function hashTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 3)) % 21;
  return (h - 10) * 0.22;
}

function eventMedium(
  medium: string,
): ArtistMedium | "community" {
  switch (medium) {
    case "music":
    case "theater":
    case "visual":
    case "dance":
    case "literary":
    case "multidisciplinary":
      return medium;
    default:
      return "community";
  }
}

/**
 * Assemble The Wall from real artists, published nights, reserved frames,
 * the Hacienda room, and kindness notes. Never invents an artist name.
 */
export function buildWallPieces(input: {
  artists: ContentArtist[];
  events: ContentEvent[];
  notes: KindnessNote[];
}): WallPiece[] {
  const pieces: WallPiece[] = [];

  pieces.push({
    id: "venue-hacienda",
    kind: "venue",
    title: "The Hacienda",
    subtitle: "522 Clematis · the live room",
    story:
      "This is the house in the world — rotating showcases, donation-based merch, and a space built to connect. The wall online is a sister to this room.",
    image: assets.hacienda,
    imageAlt: "The Artist Post live space at Hacienda",
    medium: "community",
    neighborhood: "hacienda",
    availability: "upcoming",
    href: "/get-involved?door=events",
    bookHref: "/get-involved?door=space",
    eventIds: input.events.map((e) => e.id),
    kindnessIds: [],
    x: 980,
    y: 280,
    w: 840,
    h: 520,
    rotate: 0,
  });

  input.artists.forEach((artist, i) => {
    const slot = ARTIST_SLOTS[i % ARTIST_SLOTS.length]!;
    const row = Math.floor(i / ARTIST_SLOTS.length);
    pieces.push({
      id: `artist-${artist.id}`,
      kind: "artist",
      title: artist.name,
      subtitle: mediumLabel(artist.medium),
      story: artist.bio,
      image: artist.image,
      imageAlt: `Portrait of ${artist.name}`,
      medium: artist.medium,
      neighborhood: "hacienda",
      availability: artist.comingSoon ? "upcoming" : "upcoming",
      href: artist.handle ? `/artist/${artist.handle}` : undefined,
      bookHref: "/get-involved?door=space",
      eventIds: [],
      kindnessIds: [],
      x: slot.x + row * 40,
      y: slot.y + row * 30,
      w: slot.w,
      h: slot.h,
      rotate: slot.rotate,
    });
  });

  const claimedMediums = new Set(input.artists.map((a) => a.medium));
  for (const slot of RESERVED_SLOTS) {
    if (claimedMediums.has(slot.medium)) continue;
    pieces.push({
      id: slot.id,
      kind: "reserved",
      title: "Waiting for a name",
      subtitle: `${mediumLabel(slot.medium)} · frame reserved`,
      story:
        "This frame is hung and lit. When an artist is approved, their portrait and story land here — never a placeholder face.",
      image: undefined,
      imageAlt: `Empty ${mediumLabel(slot.medium)} frame waiting for an artist`,
      medium: slot.medium,
      neighborhood: "hacienda",
      availability: "open",
      bookHref: "/get-involved?door=space",
      eventIds: [],
      kindnessIds: [],
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
      rotate: slot.rotate,
    });
  }

  const eventLayout = [
    { x: 980, y: 860, w: 400, h: 280 },
    { x: 1420, y: 860, w: 400, h: 280 },
    { x: 980, y: 1180, w: 400, h: 260 },
    { x: 1420, y: 1180, w: 400, h: 260 },
  ];

  input.events.forEach((event, i) => {
    const slot = eventLayout[i % eventLayout.length]!;
    const col = Math.floor(i / eventLayout.length);
    pieces.push({
      id: `event-${event.id}`,
      kind: "event",
      title: event.title,
      subtitle: `${event.venue} · ${event.comingSoon ? "Being prepared" : event.artist}`,
      story: event.description,
      image: i % 2 === 0 ? assets.haciendaHero : assets.comingSoon,
      imageAlt: event.title,
      medium: eventMedium(event.medium),
      neighborhood: "clematis",
      availability: event.comingSoon ? "upcoming" : "upcoming",
      showcaseDate: event.start,
      href: `/event/${event.id}`,
      bookHref: "/get-involved?door=events",
      eventIds: [event.id],
      kindnessIds: [],
      x: slot.x + col * 20,
      y: slot.y + col * 16,
      w: slot.w,
      h: slot.h,
      rotate: i % 2 === 0 ? -0.5 : 0.7,
    });
  });

  input.notes.forEach((note, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    pieces.push({
      id: `kindness-${note.id}`,
      kind: "kindness",
      title: note.fromLabel,
      subtitle: "A spark on the plaster",
      story: note.body,
      imageAlt: `Kindness note from ${note.fromLabel}`,
      medium: "kindness",
      neighborhood: "downtown",
      availability: "open",
      href: "/kindness-always",
      eventIds: [],
      kindnessIds: [note.id],
      x: 220 + col * 500 + (row % 2) * 40,
      y: 80 + row * 70,
      w: 220,
      h: 150,
      rotate: hashTilt(note.id),
    });
  });

  for (const note of input.notes) {
    if (note.pinKind === "event") {
      pieces.find((p) => p.kind === "event")?.kindnessIds.push(note.id);
    } else if (note.pinKind === "wall" || note.pinKind === "house") {
      pieces.find((p) => p.kind === "venue")?.kindnessIds.push(note.id);
    } else if (note.pinKind === "artist") {
      const frame =
        pieces.find((p) => p.kind === "artist") ??
        pieces.find((p) => p.kind === "reserved");
      frame?.kindnessIds.push(note.id);
    }
  }

  return pieces.map((p) => ({
    ...p,
    x: Math.max(40, Math.min(p.x, WALL_CANVAS.width - p.w - 40)),
    y: Math.max(40, Math.min(p.y, WALL_CANVAS.height - p.h - 40)),
  }));
}

export function wallHasNamedArtists(pieces: WallPiece[]): boolean {
  return pieces.some((p) => p.kind === "artist");
}
