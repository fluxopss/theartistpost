import { describe, expect, it } from "vitest";
import { events } from "@/data/events";
import { copy } from "@/content/site";
import {
  countdownParts,
  featuredNight,
  floorBeats,
  formatNightWhen,
  nightPhase,
  scheduleLabel,
  stampWord,
} from "@/features/night/program";
import { isNightHoneypot, parseNightRsvp, passCode } from "@/features/night/rsvp";

const NOW = new Date("2026-09-22T15:00:00-04:00");

describe("featured night", () => {
  it("holds the next night that has not ended", () => {
    const night = featuredNight(events, NOW);
    expect(night?.id).toBe("e4");
    expect(nightPhase(night!, NOW)).toBe("upcoming");
  });

  it("treats the posted window as live, then closed", () => {
    const night = events.find((event) => event.id === "e4")!;
    expect(nightPhase(night, new Date("2026-09-26T18:00:00-04:00"))).toBe("live");
    expect(featuredNight(events, new Date("2026-10-01T12:00:00-04:00"))).toBeNull();
    expect(scheduleLabel(events[0]!, NOW)).toBe("Date passed");
    expect(scheduleLabel(night, NOW)).toBe("Lineup unposted");
  });

  it("stamps the door without inventing a lineup", () => {
    expect(stampWord("upcoming")).toBe("Admit one");
    expect(stampWord("live")).toBe("Tonight");
    const beats = floorBeats({ venue: "Hacienda" });
    expect(beats.map((beat) => beat.id)).toEqual([
      "doors",
      "frames",
      "kindness",
      "close",
    ]);
    const text = beats.map((beat) => `${beat.title} ${beat.body}`).join(" ");
    expect(text).toMatch(/approved/i);
    expect(text).not.toMatch(/\bTBA\b/);
    expect(copy.night.lineup).toMatch(/approved/i);
  });

  it("formats the Clematis clock, not the server zone", () => {
    const when = formatNightWhen(events.find((event) => event.id === "e4")!);
    expect(when.weekday).toBe("Sat");
    expect(when.month).toBe("Sep");
    expect(when.day).toBe("26");
    expect(when.time).toBe("4:00 PM");
  });

  it("counts down only while the doors are still ahead", () => {
    const start = "2026-09-26T16:00:00-04:00";
    const parts = countdownParts(start, NOW);
    expect(parts?.days).toBe(4);
    expect(countdownParts(start, new Date("2026-09-26T16:00:00-04:00"))).toBeNull();
  });
});

describe("night rsvp", () => {
  it("issues a stable pass code", () => {
    expect(passCode("e4", "Guest@Example.com")).toBe(
      passCode("e4", "guest@example.com"),
    );
    expect(passCode("e4", "guest@example.com")).toMatch(/^TAP-[0-9A-Z]{4}$/);
  });

  it("accepts a seat and rejects junk", () => {
    const ok = parseNightRsvp({
      eventId: "e4",
      name: "Ada",
      email: "ada@example.com",
      party: 2,
      note: "Bringing a friend.",
    });
    expect(ok.ok).toBe(true);
    expect(parseNightRsvp({ eventId: "e4", name: "A", email: "nope", party: 0 }).ok).toBe(
      false,
    );
    expect(parseNightRsvp({ eventId: "e4", name: "Ada", email: "ada@example.com", party: 9 }).ok).toBe(
      false,
    );
    expect(isNightHoneypot("http://spam")).toBe(true);
    expect(isNightHoneypot("")).toBe(false);
  });
});
