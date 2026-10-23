import { describe, expect, it } from "vitest";
import { hours, houseSchedule } from "@/content/site";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import {
  formatMinutes,
  isOpenAt,
  localClock,
  openingHoursSpecification,
  todayLabel,
  weeklyLabel,
  type WeeklyHours,
} from "@/lib/hours";

/** Eastern wall-clock time → Date. Oct 2026 is EDT (UTC-4); Dec is EST (UTC-5). */
const edt = (iso: string) => new Date(`${iso}-04:00`);
const est = (iso: string) => new Date(`${iso}-05:00`);

// Oct 2026: Thu 22, Fri 23, Sat 24, Sun 25.
describe("Hacienda hours (official, Oct 2026)", () => {
  it("opens at 11 AM every day", () => {
    expect(isOpenAt(houseSchedule, edt("2026-10-22T10:59"))).toBe(false);
    expect(isOpenAt(houseSchedule, edt("2026-10-22T11:00"))).toBe(true);
    expect(isOpenAt(houseSchedule, edt("2026-10-25T11:00"))).toBe(true);
  });

  it("closes at 11 PM Sunday through Thursday", () => {
    expect(isOpenAt(houseSchedule, edt("2026-10-22T22:59"))).toBe(true);
    expect(isOpenAt(houseSchedule, edt("2026-10-22T23:00"))).toBe(false);
    expect(isOpenAt(houseSchedule, edt("2026-10-25T23:30"))).toBe(false);
  });

  it("stays open until midnight Friday and Saturday", () => {
    expect(isOpenAt(houseSchedule, edt("2026-10-23T23:30"))).toBe(true);
    expect(isOpenAt(houseSchedule, edt("2026-10-24T23:59"))).toBe(true);
    // Midnight Saturday night = Sunday 00:00: closed.
    expect(isOpenAt(houseSchedule, edt("2026-10-25T00:00"))).toBe(false);
    expect(isOpenAt(houseSchedule, edt("2026-10-24T00:30"))).toBe(false);
  });

  it("uses Eastern time, including after the DST change", () => {
    // Fri Dec 4 2026, 11:30 PM EST = Sat 04:30 UTC.
    expect(isOpenAt(houseSchedule, est("2026-12-04T23:30"))).toBe(true);
    expect(localClock(est("2026-12-04T23:30"), "America/New_York")).toEqual({
      day: 5,
      minutes: 23 * 60 + 30,
    });
  });

  it("labels the week and today", () => {
    expect(hours.label).toBe("Sun–Thu 11 AM – 11 PM · Fri–Sat 11 AM – Midnight");
    expect(todayLabel(houseSchedule, edt("2026-10-22T12:00"))).toBe("11 AM – 11 PM");
    expect(todayLabel(houseSchedule, edt("2026-10-23T12:00"))).toBe("11 AM – Midnight");
  });

  it("publishes schema.org opening hours with a 24:00 midnight close", () => {
    expect(openingHoursSpecification(houseSchedule)).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "11:00",
        closes: "23:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday", "Saturday"],
        opens: "11:00",
        closes: "24:00",
      },
    ]);
    const org = organizationJsonLd() as { location: { openingHoursSpecification: unknown[] } };
    expect(org.location.openingHoursSpecification).toHaveLength(2);
  });
});

describe("weekly hours math", () => {
  const lateFriday: WeeklyHours = {
    timeZone: "America/New_York",
    weekly: [
      { day: 1, openMinutes: 9 * 60 + 30, closeMinutes: 17 * 60 },
      { day: 5, openMinutes: 18 * 60, closeMinutes: 25 * 60 }, // to 1 AM Sat
    ],
  };

  it("carries a past-midnight close into the next morning", () => {
    expect(isOpenAt(lateFriday, edt("2026-10-24T00:30"))).toBe(true);
    expect(isOpenAt(lateFriday, edt("2026-10-24T01:00"))).toBe(false);
  });

  it("treats a missing day as closed", () => {
    expect(isOpenAt(lateFriday, edt("2026-10-20T12:00"))).toBe(false);
    expect(todayLabel(lateFriday, edt("2026-10-20T12:00"))).toBe("Closed today");
    expect(weeklyLabel(lateFriday)).toBe(
      "Sun Closed · Mon 9:30 AM – 5 PM · Tue–Thu Closed · Fri 6 PM – 1 AM · Sat Closed",
    );
  });

  it("formats noon and midnight as words", () => {
    expect(formatMinutes(720)).toBe("Noon");
    expect(formatMinutes(1440)).toBe("Midnight");
    expect(formatMinutes(0)).toBe("Midnight");
    expect(formatMinutes(13 * 60 + 5)).toBe("1:05 PM");
  });
});
