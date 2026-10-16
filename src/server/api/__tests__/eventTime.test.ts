import { describe, expect, it } from "vitest";
import {
  formatLocalInZone,
  parseEventInstant,
  zonedLocalToDate,
} from "@/server/api/eventTime";

const NY = "America/New_York";

describe("zonedLocalToDate", () => {
  it("reads wall time in daylight time (EDT, UTC-4)", () => {
    expect(zonedLocalToDate("2026-10-30T18:00", NY)?.toISOString()).toBe(
      "2026-10-30T22:00:00.000Z",
    );
  });

  it("reads wall time in standard time (EST, UTC-5)", () => {
    expect(zonedLocalToDate("2026-12-05T18:00", NY)?.toISOString()).toBe(
      "2026-12-05T23:00:00.000Z",
    );
  });

  it("handles the day daylight time ends (2026-11-01)", () => {
    // 09:00 that morning is already EST.
    expect(zonedLocalToDate("2026-11-01T09:00", NY)?.toISOString()).toBe(
      "2026-11-01T14:00:00.000Z",
    );
  });

  it("rejects impossible dates and garbage", () => {
    expect(zonedLocalToDate("2026-02-31T10:00", NY)).toBeNull();
    expect(zonedLocalToDate("tomorrow evening", NY)).toBeNull();
  });
});

describe("formatLocalInZone", () => {
  it("is the inverse of zonedLocalToDate", () => {
    const d = new Date("2026-10-30T22:00:00.000Z");
    expect(formatLocalInZone(d, NY)).toBe("2026-10-30T18:00");
  });
});

describe("parseEventInstant", () => {
  it("honors an explicit offset or Z", () => {
    expect(
      parseEventInstant("2026-10-30T18:00:00-04:00", NY)?.toISOString(),
    ).toBe("2026-10-30T22:00:00.000Z");
    expect(parseEventInstant("2026-10-30T22:00:00Z", NY)?.toISOString()).toBe(
      "2026-10-30T22:00:00.000Z",
    );
  });

  it("treats an offset-less value as house time", () => {
    expect(parseEventInstant("2026-10-30T18:00", NY)?.toISOString()).toBe(
      "2026-10-30T22:00:00.000Z",
    );
    expect(parseEventInstant("2026-10-30 18:00", NY)?.toISOString()).toBe(
      "2026-10-30T22:00:00.000Z",
    );
  });

  it("returns null for nonsense", () => {
    expect(parseEventInstant("", NY)).toBeNull();
    expect(parseEventInstant("soon", NY)).toBeNull();
  });
});
