import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useMedia", () => ({
  useIsTouchDevice: () => false,
  useReducedMotion: () => false,
}));

import { CursorTrail } from "@/components/CursorTrail";

describe("CursorTrail keeps the real pointer visible", () => {
  it("never hides the system cursor while the trail is on", () => {
    render(<CursorTrail />);
    expect(document.documentElement.classList.contains("cursor-trail-active")).toBe(false);
  });

  it("the only cursor:none rule in the CSS is gated by the class it never adds", () => {
    const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
    const hides = css.match(/[^{}]*\{[^{}]*cursor\s*:\s*none[^{}]*\}/g) ?? [];
    for (const rule of hides) expect(rule).toContain("html.cursor-trail-active");
  });

  it("the trail itself never captures clicks", () => {
    const { container } = render(<CursorTrail />);
    expect(container.querySelector(".cursor-trail")?.className).toContain("pointer-events-none");
  });
});
