import { after } from "next/server";
import {
  JOIN_INTENT,
  sendLeadToGhl,
  type JoinRole,
  type LeadPayload,
  type LeadPlatform,
} from "@/lib/ghl";

export type JoinCrmInput = {
  name: string;
  email: string;
  role: JoinRole;
  handle?: string;
  platform?: LeadPlatform;
  /** "website" for /join, "app" for POST /api/v1/auth/join. */
  surface: "website" | "app";
};

/** The CRM payload for a brand-new account. Pure, so it is unit-tested directly. */
export function joinLeadPayload(input: JoinCrmInput): LeadPayload {
  return {
    name: input.name,
    email: input.email.trim().toLowerCase(),
    intent: JOIN_INTENT,
    role: input.role,
    ...(input.handle ? { handle: input.handle.toLowerCase() } : {}),
    ...(input.platform ? { platform: input.platform } : {}),
    source:
      input.surface === "website" ? "theartistpost-join" : "theartistpost-app-join",
    page: input.surface === "website" ? "/join" : "/api/v1/auth/join",
  };
}

/** Send the join to the CRM; never throws, so a stuck CRM can never fail a join. */
export async function deliverJoinToCrm(input: JoinCrmInput): Promise<void> {
  try {
    const result = await sendLeadToGhl(joinLeadPayload(input));
    if (!result.ok) {
      console.error("[join-crm] not delivered", { error: result.error, surface: input.surface });
    }
  } catch (err) {
    console.error("[join-crm] error", {
      message: err instanceof Error ? err.message : String(err),
      surface: input.surface,
    });
  }
}

/**
 * Fire-and-forget after the join response is sent (next/server `after`).
 * Call only after a NEW account is created; returning sign-ins never post.
 */
export function scheduleJoinToCrm(input: JoinCrmInput): void {
  try {
    after(() => deliverJoinToCrm(input));
  } catch {
    // Outside a request scope (scripts, tests): send detached. deliverJoinToCrm never rejects.
    void deliverJoinToCrm(input);
  }
}
