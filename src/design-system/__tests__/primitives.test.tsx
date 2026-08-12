/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChip } from "@/design-system/primitives/Chip";
import { Tabs } from "@/design-system/primitives/Tabs";
import { Lightbox } from "@/design-system/primitives/Lightbox";
import { moderateKindnessBody } from "@/features/kindness/moderation";

afterEach(() => {
  cleanup();
});

describe("FilterChip", () => {
  it("marks active filter for screen readers via aria-label link", () => {
    render(
      <FilterChip name="Music" slug="music" active href="/explore?tag=music" />,
    );
    expect(screen.getByLabelText("Filter Music")).toBeTruthy();
  });
});

describe("Tabs keyboard", () => {
  it("moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        label="View"
        value="list"
        onChange={onChange}
        items={[
          { id: "list", label: "List" },
          { id: "calendar", label: "Month" },
        ]}
      />,
    );
    const listTab = screen.getByRole("tab", { name: "List" });
    listTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("calendar");
  });
});

describe("Lightbox gallery", () => {
  it("opens with title and advances on next", async () => {
    const user = userEvent.setup();
    const onIndex = vi.fn();
    render(
      <Lightbox
        open
        onOpenChange={() => undefined}
        index={0}
        onIndexChange={onIndex}
        items={[
          { src: "/brand/cover-opt.webp", alt: "One", title: "First" },
          { src: "/brand/logo.webp", alt: "Two", title: "Second" },
        ]}
      />,
    );
    expect(screen.getAllByText("First").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Next image" }));
    expect(onIndex).toHaveBeenCalledWith(1);
  });

  it("advances on ArrowRight", async () => {
    const user = userEvent.setup();
    const onIndex = vi.fn();
    render(
      <Lightbox
        open
        onOpenChange={() => undefined}
        index={0}
        onIndexChange={onIndex}
        items={[
          { src: "/brand/cover-opt.webp", alt: "One", title: "First" },
          { src: "/brand/logo.webp", alt: "Two", title: "Second" },
        ]}
      />,
    );
    await user.keyboard("{ArrowRight}");
    expect(onIndex).toHaveBeenCalledWith(1);
  });

  it("exposes close control", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Lightbox
        open
        onOpenChange={onOpenChange}
        index={0}
        onIndexChange={() => undefined}
        items={[{ src: "/brand/cover-opt.webp", alt: "Art", title: "Piece" }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Close lightbox" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Create confirm gate helpers", () => {
  it("moderation still blocks spam URLs used in forms", () => {
    expect(moderateKindnessBody("Visit https://evil.test").ok).toBe(false);
  });
});
