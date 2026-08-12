import { KINDNESS_MAX_BODY } from "./types";
import { moderateKindnessBody } from "./moderation";

/** Pure helpers for the Kindness compose ritual — safe to unit-test. */

export function canLeaveComposeStep(
  step: 1 | 2 | 3,
  body: string,
): { ok: boolean; error?: string } {
  if (step !== 2) return { ok: true };
  if (body.length > KINDNESS_MAX_BODY) {
    return {
      ok: false,
      error: `Keep it under ${KINDNESS_MAX_BODY} characters.`,
    };
  }
  return moderateKindnessBody(body);
}

export function clampKindnessBody(body: string): string {
  return body.slice(0, KINDNESS_MAX_BODY);
}
