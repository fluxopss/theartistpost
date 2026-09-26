import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { events } from "@/data/events";
import {
  easternDayKey,
  formatAgendaTimes,
  formatRange,
} from "@/components/ScheduleView";

describe("Hacienda schedule clock", () => {
  const previousTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "UTC";
  });

  afterEach(() => {
    if (previousTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTz;
    }
  });

  it("renders e4 as 4:00 PM – 9:00 PM Eastern under a UTC process timezone", () => {
    const e4 = events.find((event) => event.id === "e4")!;
    expect(e4.start).toBe("2026-09-26T16:00:00-04:00");
    expect(e4.end).toBe("2026-09-26T21:00:00-04:00");

    // Same instant reads 8:00 PM in UTC — proves we are not using process zone.
    expect(
      new Date(e4.start).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }),
    ).toBe("8:00 PM");

    const range = formatRange(e4);
    expect(range).toContain("4:00 PM – 9:00 PM");
    expect(range).toMatch(/Eastern$/);
    expect(range).toMatch(/^Sat, Sep 26, 2026 ·/);

    expect(formatAgendaTimes(e4)).toBe("4:00 PM – 9:00 PM Eastern");
    expect(easternDayKey(e4.start)).toBe("2026-09-26");
  });
});
