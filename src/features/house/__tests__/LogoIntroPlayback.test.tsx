import { act } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LogoIntro } from "@/features/house/LogoIntro";
import { LOGO_INTRO_KEY } from "@/features/house/logoIntroGate";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
  document.documentElement.classList.remove("logo-intro-active");
});

const intro = () => screen.queryByRole("dialog", { name: /introduction/ });

describe("LogoIntro playback", () => {
  it("never renders on the server", () => {
    expect(renderToString(<LogoIntro />)).toBe("");
  });

  it("plays once per session, fades out, then leaves", () => {
    render(<LogoIntro />);
    expect(intro()).toBeTruthy();
    expect(intro()!.className).toBe("logo-intro");
    expect(window.sessionStorage.getItem(LOGO_INTRO_KEY)).toBe("1");
    expect(document.documentElement.classList.contains("logo-intro-active")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3800);
    });
    expect(intro()!.className).toBe("logo-intro logo-intro--out");

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(intro()).toBeNull();
    expect(document.documentElement.classList.contains("logo-intro-active")).toBe(false);

    cleanup();
    render(<LogoIntro />);
    expect(intro()).toBeNull();
  });

  it("can be skipped", () => {
    render(<LogoIntro />);
    fireEvent.click(screen.getByRole("button", { name: "Enter the house" }));
    expect(intro()).toBeNull();
    expect(document.documentElement.classList.contains("logo-intro-active")).toBe(false);
  });
});
