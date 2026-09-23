import type { ContentEvent } from "@/lib/content";

export type NightPhase = "upcoming" | "live" | "closed";

export type FloorBeat = {
  id: string;
  kicker: string;
  title: string;
  body: string;
};

const NY = "America/New_York";

export function nightPhase(
  event: Pick<ContentEvent, "start" | "end">,
  now = new Date(),
): NightPhase {
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();
  const t = now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "closed";
  if (t < start) return "upcoming";
  if (t <= end) return "live";
  return "closed";
}

/** The night people can still walk into — soonest event that has not ended. */
export function featuredNight<T extends Pick<ContentEvent, "start" | "end">>(
  events: T[],
  now = new Date(),
): T | null {
  const open = events
    .filter((event) => nightPhase(event, now) !== "closed")
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  return open[0] ?? null;
}

export function scheduleLabel(
  event: Pick<ContentEvent, "start" | "end" | "comingSoon">,
  now = new Date(),
): string {
  const phase = nightPhase(event, now);
  switch (phase) {
    case "closed":
      return "Date passed";
    case "live":
      return "Tonight";
    case "upcoming":
      return event.comingSoon ? "Lineup unposted" : "On the board";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function stampWord(phase: NightPhase): string {
  switch (phase) {
    case "live":
      return "Tonight";
    case "closed":
      return "Closed";
    case "upcoming":
      return "Admit one";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export type NightWhen = {
  weekday: string;
  month: string;
  day: string;
  time: string;
  endTime: string;
};

export function formatNightWhen(
  event: Pick<ContentEvent, "start" | "end">,
): NightWhen {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const date = (d: Date, options: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("en-US", { ...options, timeZone: NY });
  const time = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: NY,
    });
  return {
    weekday: date(start, { weekday: "short" }),
    month: date(start, { month: "short" }),
    day: date(start, { day: "numeric" }),
    time: time(start),
    endTime: time(end),
  };
}

export function countdownParts(startIso: string, now = new Date()) {
  const ms = new Date(startIso).getTime() - now.getTime();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
  };
}

/**
 * The floor of a night — rooms and rituals, never a stand-in lineup.
 * Artist names stay off until the nonprofit approves them.
 */
export function floorBeats(event: Pick<ContentEvent, "venue">): FloorBeat[] {
  return [
    {
      id: "doors",
      kicker: "Arrival",
      title: "Show the pass",
      body: `${event.venue}. The pass on this device is how the door knows you held a seat.`,
    },
    {
      id: "frames",
      kicker: "The wall",
      title: "Frames stay honest",
      body: "Lights are up. A name lands on a frame only after that artist is approved — never a stand-in face.",
    },
    {
      id: "kindness",
      kicker: "Kindness Always",
      title: "Wear the mark",
      body: "Merch and conversation. Proceeds support local arts, the artists, the venue, and community nights.",
    },
    {
      id: "close",
      kicker: "Last light",
      title: "Leave a spark",
      body: "Pin a line before you go. The house keeps the kindness after the lights come up.",
    },
  ];
}
