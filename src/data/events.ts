export type ScheduleEvent = {
  id: string;
  title: string;
  artist: string;
  medium: string;
  start: string; // ISO
  end: string; // ISO
  venue: string;
  description: string;
  comingSoon?: boolean;
};

/** Placeholder schedule — replace when artisan calendar is published. */
export const events: ScheduleEvent[] = [
  {
    id: "e1",
    title: "Artisan Showcase — Opening Weekend",
    artist: "Featured Local Creatives",
    medium: "multidisciplinary",
    start: "2026-09-05T12:00:00-04:00",
    end: "2026-09-05T20:00:00-04:00",
    venue: "Hacienda · 522 Clematis Street",
    description:
      "Rotating artist showcases, donation-based merch, and community hangouts at The Artist Post @ The Hacienda.",
    comingSoon: true,
  },
  {
    id: "e2",
    title: "Live Acoustic Evening",
    artist: "TBA",
    medium: "music",
    start: "2026-09-12T18:00:00-04:00",
    end: "2026-09-12T21:00:00-04:00",
    venue: "Hacienda · 522 Clematis Street",
    description:
      "Intimate acoustic sets from West Palm Beach musicians. Schedule details coming soon.",
    comingSoon: true,
  },
  {
    id: "e3",
    title: "Visual Arts Pop-Up",
    artist: "TBA",
    medium: "visual",
    start: "2026-09-19T11:00:00-04:00",
    end: "2026-09-19T17:00:00-04:00",
    venue: "Hacienda · 522 Clematis Street",
    description:
      "Meet visual artists, browse original work, and support local makers.",
    comingSoon: true,
  },
  {
    id: "e4",
    title: "Kindness Always Community Night",
    artist: "The Artist Post",
    medium: "community",
    start: "2026-09-26T16:00:00-04:00",
    end: "2026-09-26T21:00:00-04:00",
    venue: "Hacienda · 522 Clematis Street",
    description:
      "Merch, conversation, and intentional kindness — all proceeds support local arts.",
    comingSoon: true,
  },
];

export { googleCalendarUrl } from "@/lib/schedule/calendar";
