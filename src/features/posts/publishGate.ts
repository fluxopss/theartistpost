/**
 * Create-post publish gate — nothing posts until the user confirms.
 * Keep framework-agnostic for future native apps.
 */
export function assertPublishConfirmed(confirmed: boolean): {
  ok: boolean;
  error?: string;
} {
  if (!confirmed) {
    return {
      ok: false,
      error: "Confirm before publishing — nothing posts until you approve.",
    };
  }
  return { ok: true };
}

export function isReviewStep(stepIndex: number, totalSteps: number): boolean {
  return totalSteps > 0 && stepIndex === totalSteps - 1;
}
