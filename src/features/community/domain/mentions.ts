export type MentionToken =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; handle: string };

const MENTION = /(^|\s)@([a-z0-9_-]{2,40})/gi;
const MAX_LINKED = 5;

/**
 * Splits a community body into plain text and `@handle` mentions so the UI
 * can make the mentions tappable. Same rule as the server (a mention follows
 * start-of-text or whitespace; only the first five are real mentions).
 * Joining every token's `value` always reproduces the body exactly.
 */
export function tokenizeMentions(body: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let cursor = 0;
  let linked = 0;

  for (const match of body.matchAll(MENTION)) {
    if (linked === MAX_LINKED) break;
    const lead = match[1] ?? "";
    const handle = match[2] ?? "";
    const start = (match.index ?? 0) + lead.length;
    if (start > cursor) tokens.push({ type: "text", value: body.slice(cursor, start) });
    const value = `@${handle}`;
    tokens.push({ type: "mention", value, handle: handle.toLowerCase() });
    cursor = start + value.length;
    linked += 1;
  }

  if (cursor < body.length) tokens.push({ type: "text", value: body.slice(cursor) });
  return tokens.length > 0 ? tokens : [{ type: "text", value: body }];
}
