// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blockBooking, type BlockBookingConfig } from "@/content/booking";
import {
  addDays,
  assertValidConfig,
  blocksForDay,
  findBlock,
  houseDay,
  windowDays,
} from "@/server/api/blockSchedule";

const hours = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 3_600_000;

describe("blocksForDay", () => {
  it("makes three four-hour blocks from 11:00 to 23:00 house time", () => {
    const blocks = blocksForDay("2026-11-12", blockBooking);
    expect(blocks).toHaveLength(3);
    // November = EST (UTC-5)
    expect(blocks.map((b) => b.startsAt.toISOString())).toEqual([
      "2026-11-12T16:00:00.000Z",
      "2026-11-12T20:00:00.000Z",
      "2026-11-13T00:00:00.000Z",
    ]);
    expect(blocks[2]!.endsAt.toISOString()).toBe("2026-11-13T04:00:00.000Z");
    expect(blocks.map((b) => b.index)).toEqual([0, 1, 2]);
    for (const b of blocks) expect(hours(b.startsAt, b.endsAt)).toBe(4);
  });

  it("keeps the same clock hours across daylight-time changes", () => {
    // Spring forward 2027-03-14, fall back 2026-11-01 (changes happen at 2 AM).
    for (const day of ["2027-03-13", "2027-03-14", "2027-03-15", "2026-10-31", "2026-11-01", "2026-11-02"]) {
      const blocks = blocksForDay(day, blockBooking);
      expect(blocks).toHaveLength(3);
      const first = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(blocks[0]!.startsAt);
      expect(first).toBe("11:00");
      for (const b of blocks) expect(hours(b.startsAt, b.endsAt)).toBe(4);
    }
    // The UTC instant moves one hour with daylight time.
    expect(blocksForDay("2026-11-01", blockBooking)[0]!.startsAt.toISOString()).toBe(
      "2026-11-01T16:00:00.000Z",
    );
    expect(blocksForDay("2026-10-31", blockBooking)[0]!.startsAt.toISOString()).toBe(
      "2026-10-31T15:00:00.000Z",
    );
  });

  it("follows the config instead of hard-coded numbers", () => {
    const cfg: BlockBookingConfig = {
      ...blockBooking,
      opensAt: "11:00",
      closesAt: "23:00",
      blockHours: 3,
      blocksPerDay: 4,
    };
    const blocks = blocksForDay("2026-11-12", cfg);
    expect(blocks).toHaveLength(4);
    expect(blocks[0]!.startsAt.toISOString()).toBe("2026-11-12T16:00:00.000Z");
  });

  it("returns nothing for a malformed day", () => {
    expect(blocksForDay("2026-13-40", blockBooking)).toEqual([]);
    expect(blocksForDay("nope", blockBooking)).toEqual([]);
  });
});

describe("assertValidConfig", () => {
  it("accepts the placeholder config", () => {
    expect(() => assertValidConfig(blockBooking)).not.toThrow();
  });
  it("rejects blocks that do not fit the open hours", () => {
    expect(() => assertValidConfig({ ...blockBooking, blocksPerDay: 4 })).toThrow(/fit/);
  });
  it("rejects close before open and zero caps", () => {
    expect(() => assertValidConfig({ ...blockBooking, closesAt: "09:00" })).toThrow();
    expect(() => assertValidConfig({ ...blockBooking, capacityPerBlock: 0 })).toThrow();
    expect(() => assertValidConfig({ ...blockBooking, maxUpcomingPerPerson: 0 })).toThrow();
  });
});

describe("window", () => {
  it("lists horizonDays days starting from the house-zone today", () => {
    // 2026-11-12 02:00Z is still Nov 11 evening in New York.
    const now = new Date("2026-11-12T02:00:00Z");
    expect(houseDay(now, "America/New_York")).toBe("2026-11-11");
    const days = windowDays(now, blockBooking);
    expect(days).toHaveLength(14);
    expect(days[0]).toBe("2026-11-11");
    expect(days[13]).toBe("2026-11-24");
  });

  it("walks calendar days across month and daylight changes", () => {
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("only finds blocks inside the window", () => {
    const now = new Date("2026-11-12T14:00:00Z");
    expect(findBlock("2026-11-12", 1, now, blockBooking)?.index).toBe(1);
    expect(findBlock("2026-11-12", 3, now, blockBooking)).toBeNull();
    expect(findBlock("2027-01-01", 0, now, blockBooking)).toBeNull();
    expect(findBlock("2026-11-10", 0, now, blockBooking)).toBeNull();
  });
});
