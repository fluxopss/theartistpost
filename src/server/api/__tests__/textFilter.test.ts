import { describe, expect, it } from "vitest";
import {
  BLOCKED_TERMS,
  KIND_MESSAGE,
  MAX_LINKS,
  countLinks,
  screenText,
} from "@/server/api/textFilter";

describe("screenText", () => {
  it("passes ordinary, kind text", () => {
    expect(screenText("Loved your set last night, @robbie — so good!")).toEqual({
      ok: true,
    });
    expect(screenText("Showing new oil paintings at the Hacienda Friday")).toEqual({
      ok: true,
    });
  });

  it("blocks listed terms, case-insensitively, with the kind message", () => {
    const term = BLOCKED_TERMS[0]!;
    for (const text of [term, term.toUpperCase(), `well ${term}!`, `a ${term}.`]) {
      expect(screenText(text)).toEqual({ ok: false, message: KIND_MESSAGE });
    }
    expect(KIND_MESSAGE).toBe("Let's keep it kind — please rephrase.");
  });

  it("blocks multi-word phrases across extra whitespace", () => {
    const phrase = BLOCKED_TERMS.find((t) => t.includes(" "))!;
    expect(screenText(phrase.replace(" ", "   ")).ok).toBe(false);
  });

  it("matches whole words only (no Scunthorpe problem)", () => {
    expect(screenText("Greetings from Scunthorpe and the Dykes Hotel")).toEqual({
      ok: true,
    });
    expect(screenText("I leased a concoction of grapes")).toEqual({ ok: true });
  });

  it("is not fooled by zero-width characters", () => {
    const term = BLOCKED_TERMS[0]!;
    const sneaky = `${term.slice(0, 2)}\u200B${term.slice(2)}`;
    expect(screenText(sneaky).ok).toBe(false);
  });

  it("rejects more than two links and allows two", () => {
    expect(MAX_LINKS).toBe(2);
    const two = "see https://a.example/x and www.b.example";
    expect(countLinks(two)).toBe(2);
    expect(screenText(two).ok).toBe(true);
    expect(screenText(`${two} http://c.example`)).toEqual({
      ok: false,
      message: KIND_MESSAGE,
    });
  });
});
