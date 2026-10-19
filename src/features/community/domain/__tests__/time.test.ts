import { describe, expect, it } from "vitest";
import { formatActivityTime } from "../time";

const now = Date.parse("2026-10-14T12:00:00.000Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("formatActivityTime", () => {
  it("reads a moment as just now", () => {
    expect(formatActivityTime(ago(30 * 1000), now)).toBe("just now");
  });

  it("counts minutes, then hours, then days", () => {
    expect(formatActivityTime(ago(5 * 60 * 1000), now)).toBe("5m ago");
    expect(formatActivityTime(ago(3 * 60 * 60 * 1000), now)).toBe("3h ago");
    expect(formatActivityTime(ago(2 * 24 * 60 * 60 * 1000), now)).toBe("2d ago");
  });

  it("falls back to a short date after a week", () => {
    expect(formatActivityTime(ago(10 * 24 * 60 * 60 * 1000), now)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it("treats a future timestamp as just now", () => {
    expect(formatActivityTime(new Date(now + 60 * 1000).toISOString(), now)).toBe("just now");
  });

  it("returns null for an unreadable timestamp", () => {
    expect(formatActivityTime("not a date", now)).toBeNull();
  });
});
