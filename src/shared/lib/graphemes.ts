/**
 * Length and truncation by user-perceived character (grapheme cluster), so an
 * emoji, a skin-toned hand or a ZWJ family counts as ONE, the way a person
 * counts it, instead of 2-11 UTF-16 code units.
 */

const segmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("en", { granularity: "grapheme" })
    : null;

function split(text: string): string[] {
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

export function graphemeLength(text: string): number {
  return split(text).length;
}

/** First `max` graphemes; never cuts an emoji or surrogate pair in half. */
export function truncateGraphemes(text: string, max: number): string {
  const parts = split(text);
  return parts.length <= max ? text : parts.slice(0, max).join("");
}

/**
 * Hard ceiling in UTF-16 units for a field limited to `graphemes` characters.
 * A ZWJ family emoji is 11 units, so 12 per grapheme is generous for honest
 * text while stopping combining-mark floods ("zalgo") from bloating storage.
 */
export function unitCeiling(graphemes: number): number {
  return graphemes * 12;
}
