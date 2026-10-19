export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "sexual"
  | "violence"
  | "self_harm"
  | "impersonation"
  | "other";

export type ReportReasonOption = {
  id: ReportReason;
  label: string;
};

/** Report reasons in the order the form shows them. Labels are plain words. */
export const REPORT_REASONS: readonly ReportReasonOption[] = [
  { id: "spam", label: "Spam or scams" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate or discrimination" },
  { id: "sexual", label: "Sexual content" },
  { id: "violence", label: "Violence or threats" },
  { id: "self_harm", label: "Self-harm or danger" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Something else" },
];

export const REPORT_NOTE_MAX = 500;

export function reportReasonLabel(id: ReportReason): string {
  return REPORT_REASONS.find((r) => r.id === id)?.label ?? "Something else";
}
