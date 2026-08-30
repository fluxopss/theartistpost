import { describe, expect, it } from "vitest";
import {
  isInvolveHoneypot,
  parseInvolveInquiry,
} from "@/features/involve/validation";
import {
  doorById,
  doorHref,
  INVOLVE_DOOR_IDS,
  isInvolveDoorId,
} from "@/content/involve";

describe("involve doors", () => {
  it("recognizes the five intake paths", () => {
    expect(INVOLVE_DOOR_IDS).toEqual([
      "space",
      "partner",
      "support",
      "volunteer",
      "events",
    ]);
    expect(isInvolveDoorId("space")).toBe(true);
    expect(isInvolveDoorId("merch")).toBe(false);
    expect(doorById("space").title).toMatch(/artist space/i);
    expect(doorById("support").image).toContain("donations-appreciated");
    expect(doorById("support").imageFit).toBe("contain");
    expect(doorById("volunteer").image).toContain("kindness-trademark");
    expect(doorById("space").invitation).toMatch(/showcase/i);
    expect(doorHref("space")).toBe("/get-involved?door=space");
  });
});

describe("involve inquiry validation", () => {
  const valid = {
    name: "Avery Artist",
    email: "avery@example.com",
    intent: "space" as const,
    message: "I would like a weekend slot at Hacienda.",
  };

  it("accepts a complete space inquiry", () => {
    const result = parseInvolveInquiry(valid);
    expect(result.ok).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = parseInvolveInquiry({ ...valid, name: "A" });
    expect(result.ok).toBe(false);
  });

  it("rejects a short message", () => {
    const result = parseInvolveInquiry({ ...valid, message: "Hi" });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = parseInvolveInquiry({ ...valid, email: "not-an-email" });
    expect(result.ok).toBe(false);
  });

  it("rejects a merch intent that is not an inquiry path", () => {
    const result = parseInvolveInquiry({ ...valid, intent: "support" });
    expect(result.ok).toBe(false);
  });

  it("flags filled honeypot fields", () => {
    expect(isInvolveHoneypot("")).toBe(false);
    expect(isInvolveHoneypot("https://spam.example")).toBe(true);
  });
});
