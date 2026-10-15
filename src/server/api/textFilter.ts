/**
 * Lightweight objectionable-text screen for user-generated text (App Store
 * Guideline 1.2: filter objectionable material). Intentionally small and
 * conservative — reports, hiding and moderators do the real work. Whole-word
 * matching, so innocent words that merely contain a blocked string (the
 * "Scunthorpe problem") pass.
 */

export const KIND_MESSAGE = "Let's keep it kind — please rephrase.";

/** Maximum links in one post or comment. */
export const MAX_LINKS = 2;

/** Slurs, sexually explicit terms and direct abuse. Lowercase, one phrase each. */
export const BLOCKED_TERMS: readonly string[] = [
  // slurs
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "dyke",
  "tranny",
  "kike",
  "spic",
  "chink",
  "gook",
  "wetback",
  "coon",
  "retard",
  "retarded",
  "cunt",
  // sexually explicit
  "porn",
  "pornography",
  "blowjob",
  "handjob",
  "cumshot",
  "gangbang",
  "onlyfans",
  // direct abuse and self-harm baiting
  "kill yourself",
  "kys",
  "fuck you",
  "fuck off",
  "go die",
  "hang yourself",
];

const LINK_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const blockedRe = new RegExp(
  `(?<![a-z0-9])(?:${BLOCKED_TERMS.map((term) =>
    escapeRegExp(term).replace(/\s+/g, "\\s+"),
  ).join("|")})(?![a-z0-9])`,
  "i",
);

/** Compatibility-fold and drop zero-width characters used to dodge filters. */
function normalize(text: string): string {
  return text.normalize("NFKC").replace(/[​-‍⁠﻿]/g, "");
}

export function countLinks(text: string): number {
  return text.match(LINK_RE)?.length ?? 0;
}

export function screenText(
  text: string,
): { ok: true } | { ok: false; message: string } {
  if (countLinks(text) > MAX_LINKS) {
    return { ok: false, message: KIND_MESSAGE };
  }
  if (blockedRe.test(normalize(text))) {
    return { ok: false, message: KIND_MESSAGE };
  }
  return { ok: true };
}
