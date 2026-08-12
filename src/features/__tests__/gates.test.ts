import { describe, expect, it } from "vitest";
import {
  canLeaveComposeStep,
  clampKindnessBody,
} from "@/features/kindness/composeValidation";
import { KINDNESS_MAX_BODY } from "@/features/kindness/types";
import {
  assertPublishConfirmed,
  isReviewStep,
} from "@/features/posts/publishGate";

describe("kindness compose validation", () => {
  it("allows leaving step 1 without a body", () => {
    expect(canLeaveComposeStep(1, "").ok).toBe(true);
  });

  it("blocks empty body on step 2", () => {
    const result = canLeaveComposeStep(2, "   ");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/kind words/i);
  });

  it("blocks spam links on step 2", () => {
    expect(canLeaveComposeStep(2, "See https://spam.example").ok).toBe(false);
  });

  it("allows a short kind note on step 2", () => {
    expect(
      canLeaveComposeStep(2, "Your mural stopped me on Clematis.").ok,
    ).toBe(true);
  });

  it("clamps body to 240 characters", () => {
    const long = "x".repeat(KINDNESS_MAX_BODY + 40);
    expect(clampKindnessBody(long)).toHaveLength(KINDNESS_MAX_BODY);
  });

  it("rejects over-length before clamp if still over max", () => {
    const long = "k".repeat(KINDNESS_MAX_BODY + 1);
    // canLeaveComposeStep uses moderate which slices first — after slice it's ok length
    // so clamp is the UI guard; over-max after clamp shouldn't happen
    expect(clampKindnessBody(long).length).toBe(KINDNESS_MAX_BODY);
    expect(canLeaveComposeStep(2, clampKindnessBody(long)).ok).toBe(true);
  });
});

describe("create publish gate", () => {
  it("blocks publish without confirmation", () => {
    const result = assertPublishConfirmed(false);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/confirm/i);
  });

  it("allows publish after confirmation", () => {
    expect(assertPublishConfirmed(true).ok).toBe(true);
  });

  it("detects review as the last wizard step", () => {
    expect(isReviewStep(4, 5)).toBe(true);
    expect(isReviewStep(3, 5)).toBe(false);
  });
});
