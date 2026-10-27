import { act } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useIsTouchDevice, useMediaQuery, useReducedMotion } from "@/hooks/useMedia";
import { useTheme } from "@/hooks/useTheme";

type FakeList = {
  matches: boolean;
  listeners: Set<() => void>;
};

const lists = new Map<string, FakeList>();
const originalMatchMedia = window.matchMedia;

function setMatch(query: string, matches: boolean) {
  const list = lists.get(query) ?? { matches, listeners: new Set() };
  list.matches = matches;
  lists.set(query, list);
  list.listeners.forEach((listener) => listener());
}

beforeEach(() => {
  lists.clear();
  window.matchMedia = ((query: string) => {
    if (!lists.has(query)) lists.set(query, { matches: false, listeners: new Set() });
    const list = lists.get(query)!;
    return {
      get matches() {
        return list.matches;
      },
      media: query,
      addEventListener: (_: string, listener: () => void) => list.listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => list.listeners.delete(listener),
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

function MediaProbe() {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  const wide = useMediaQuery("(min-width: 768px)");
  return <p>{`reduce:${reduce} touch:${touch} wide:${wide}`}</p>;
}

describe("media hooks", () => {
  it("default to no reduced motion and touch on the server", () => {
    expect(renderToString(<MediaProbe />)).toContain(
      "reduce:false touch:true wide:false",
    );
  });

  it("read the current match on the client and follow changes", () => {
    setMatch("(prefers-reduced-motion: reduce)", true);
    render(<MediaProbe />);
    expect(screen.getByText("reduce:true touch:false wide:false")).toBeTruthy();

    act(() => {
      setMatch("(prefers-reduced-motion: reduce)", false);
      setMatch("(hover: none)", true);
      setMatch("(min-width: 768px)", true);
    });
    expect(screen.getByText("reduce:false touch:true wide:true")).toBeTruthy();
  });
});

function ThemeProbe({ label }: { label: string }) {
  const { theme, toggleTheme, mounted } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {`${label}:${mounted ? theme : "unmounted"}`}
    </button>
  );
}

describe("useTheme", () => {
  it("is unmounted dark on the server", () => {
    window.localStorage.setItem("tap-theme", "light");
    expect(renderToString(<ThemeProbe label="a" />)).toContain("a:unmounted");
  });

  it("reads the stored theme, persists toggles, and keeps every consumer in sync", () => {
    window.localStorage.setItem("tap-theme", "light");
    render(
      <>
        <ThemeProbe label="a" />
        <ThemeProbe label="b" />
      </>,
    );
    expect(screen.getByText("a:light")).toBeTruthy();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    fireEvent.click(screen.getByText("a:light"));
    expect(screen.getByText("a:dark")).toBeTruthy();
    expect(screen.getByText("b:dark")).toBeTruthy();
    expect(window.localStorage.getItem("tap-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
