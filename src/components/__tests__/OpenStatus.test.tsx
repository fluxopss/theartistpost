import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenStatus } from "@/components/OpenStatus";

const edt = (iso: string) => new Date(`${iso}-04:00`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("OpenStatus pill", () => {
  it("server HTML is neutral, whatever the clock says (no hydration mismatch)", () => {
    vi.setSystemTime(edt("2026-10-22T12:00"));
    const open = renderToString(<OpenStatus />);
    vi.setSystemTime(edt("2026-10-22T03:00"));
    const closed = renderToString(<OpenStatus />);
    expect(open).toBe(closed);
    expect(open).toContain("Checking hours");
  });

  it("says Open now during Hacienda hours (Eastern)", () => {
    vi.setSystemTime(edt("2026-10-22T12:00"));
    render(<OpenStatus />);
    expect(screen.getByText("Open now")).toBeInTheDocument();
  });

  it("says when it opens next while closed", () => {
    vi.setSystemTime(edt("2026-10-22T08:00"));
    render(<OpenStatus />);
    expect(screen.getByText("Opens at 11 AM")).toBeInTheDocument();
  });

  it("updates itself each minute", () => {
    vi.setSystemTime(edt("2026-10-22T10:59"));
    render(<OpenStatus />);
    expect(screen.getByText("Opens at 11 AM")).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(edt("2026-10-22T11:00"));
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Open now")).toBeInTheDocument();
  });
});
