import { describe, expect, it } from "vitest";
import type { ReportReason } from "../reasons";

import { REPORT_NOTE_MAX, REPORT_REASONS, reportReasonLabel } from "../reasons";

const ALL_REASONS: ReportReason[] = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "self_harm",
  "impersonation",
  "other",
];

describe("REPORT_REASONS", () => {
  it("lists every ReportReason exactly once, in order", () => {
    expect(REPORT_REASONS.map((r) => r.id)).toEqual(ALL_REASONS);
  });

  it("gives every reason a distinct, non-empty label", () => {
    const labels = REPORT_REASONS.map((r) => r.label);
    expect(labels.every((label) => label.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("names the self-harm reason plainly", () => {
    expect(reportReasonLabel("self_harm")).toBe("Self-harm or danger");
  });
});

describe("reportReasonLabel", () => {
  it("returns the label for a reason", () => {
    expect(reportReasonLabel("spam")).toBe("Spam or scams");
  });
});

describe("REPORT_NOTE_MAX", () => {
  it("caps the optional note at 500 characters", () => {
    expect(REPORT_NOTE_MAX).toBe(500);
  });
});
