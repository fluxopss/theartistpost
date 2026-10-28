import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hours } from "@/content/site";

vi.mock("@/components/SubscribeForm", () => ({ SubscribeForm: () => null }));
vi.mock("@/components/SectionReveal", () => ({
  SectionReveal: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

import { ContactSocialSection } from "@/features/home/ContactSocialSection";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(new Date("2026-10-22T08:00:00-04:00"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("home Visit block", () => {
  it("shows the live open/closed pill next to the weekly hours", () => {
    render(<ContactSocialSection />);
    expect(screen.getByText("Opens at 11 AM")).toBeInTheDocument();
    expect(screen.getByText(hours.label)).toBeInTheDocument();
  });
});
