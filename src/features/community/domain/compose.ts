export type CommunityKind = "SHOUTOUT" | "COLLAB" | "SHOWING" | "ASK" | "KINDNESS" | "UPDATE";
import { graphemeLength as graphemeCount } from "@/shared/lib/graphemes";

export type CommunityKindOption = {
  id: CommunityKind;
  label: string;
  prompt: string;
};

/** Post kinds for the community board, in composer order. */
export const COMMUNITY_KINDS: readonly CommunityKindOption[] = [
  {
    id: "SHOUTOUT",
    label: "Shout-out",
    prompt: "Who are you lifting up today, and what did they make or do?",
  },
  {
    id: "COLLAB",
    label: "Collab call",
    prompt: "What are you looking for: a collaborator, a model, a musician, a space?",
  },
  {
    id: "SHOWING",
    label: "I'm showing",
    prompt: "Where and when is your work or performance? Include the address or link.",
  },
  {
    id: "ASK",
    label: "Ask the house",
    prompt: "What do you need help with? Ask plainly; the house answers kindly.",
  },
  {
    id: "KINDNESS",
    label: "Kindness",
    prompt: "A kind word, a favor, or a moment someone helped you this week.",
  },
  {
    id: "UPDATE",
    label: "Studio update",
    prompt: "What are you working on right now?",
  },
];

export const COMMUNITY_BODY_MAX = 500;

const MENTION_PATTERN = /(^|\s)@([a-z0-9_-]{2,40})/gi;
const MAX_MENTIONS = 5;

/**
 * Handles mentioned in a community body, lowercased, unique, capped at 5.
 * Same rule as the server's `extractMentions`.
 */
export function extractMentions(body: string): string[] {
  const found: string[] = [];
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const handle = match[2].toLowerCase();
    if (!found.includes(handle)) found.push(handle);
    if (found.length === MAX_MENTIONS) break;
  }
  return found;
}

export type CommunityBodyValidation = { ok: true; body: string } | { ok: false; message: string };

/** Composer gate: 1 to 500 characters after trimming, counted by what a person sees (emoji = 1). */
export function validateCommunityBody(raw: string): CommunityBodyValidation {
  const body = raw.trim();
  if (body.length === 0) return { ok: false, message: "Write something first." };
  if (graphemeCount(body) > COMMUNITY_BODY_MAX) {
    return { ok: false, message: `Keep it under ${COMMUNITY_BODY_MAX} characters.` };
  }
  return { ok: true, body };
}
