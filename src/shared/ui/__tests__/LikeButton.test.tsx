/**
 * @vitest-environment jsdom
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LikeButton } from "@/shared/ui/LikeButton";

const getLikeStatusAction = vi.fn();
const toggleLikeAction = vi.fn();
const useSession = vi.fn();

vi.mock("@/features/posts/engagement", () => ({
  getLikeStatusAction: (...args: unknown[]) => getLikeStatusAction(...args),
  toggleLikeAction: (...args: unknown[]) => toggleLikeAction(...args),
}));

vi.mock("@/features/auth/AuthProvider", () => ({
  useSession: () => useSession(),
}));

vi.mock("@/features/app/storage", () => ({
  isLiked: () => false,
  toggleLike: () => true,
}));

vi.mock("framer-motion", () => ({
  motion: {
    button: ({
      children,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      whileTap?: unknown;
      children?: ReactNode;
    }) => {
      const rest = { ...props };
      delete rest.whileTap;
      return <button {...rest}>{children}</button>;
    },
    span: ({
      children,
      ...props
    }: HTMLAttributes<HTMLSpanElement> & {
      initial?: unknown;
      animate?: unknown;
      children?: ReactNode;
    }) => {
      const rest = { ...props };
      delete rest.initial;
      delete rest.animate;
      return <span {...rest}>{children}</span>;
    },
  },
  useReducedMotion: () => true,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LikeButton signed-in hydrate", () => {
  beforeEach(() => {
    useSession.mockReturnValue({
      isAuthenticated: true,
      user: { id: "u1", email: "member@example.com", name: "Member", role: "VIEWER" },
    });
  });

  it("loads likedByMe from getLikeStatusAction before first click", async () => {
    getLikeStatusAction.mockResolvedValue({
      ok: true,
      liked: true,
      likeCount: 12,
    });

    render(<LikeButton id="post_1" initialCount={11} />);

    expect(getLikeStatusAction).toHaveBeenCalledWith({ postId: "post_1" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Unlike" })).toBeTruthy();
    });
    expect(screen.getByText("12")).toBeTruthy();
    expect(toggleLikeAction).not.toHaveBeenCalled();
  });
});

describe("LikeButton signed-in post change", () => {
  beforeEach(() => {
    useSession.mockReturnValue({
      isAuthenticated: true,
      user: { id: "u1", email: "member@example.com", name: "Member", role: "VIEWER" },
    });
  });

  it("drops the previous post's status until the new one loads", async () => {
    getLikeStatusAction.mockResolvedValueOnce({ ok: true, liked: true, likeCount: 12 });
    const { rerender } = render(<LikeButton id="post_1" initialCount={11} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Unlike" })).toBeTruthy();
    });

    let resolveNext: (value: unknown) => void = () => undefined;
    getLikeStatusAction.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNext = resolve;
      }),
    );
    rerender(<LikeButton id="post_2" initialCount={5} />);
    expect(screen.getByRole("button", { name: "Like" })).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(getLikeStatusAction).toHaveBeenLastCalledWith({ postId: "post_2" });

    resolveNext({ ok: true, liked: true, likeCount: 6 });
    await waitFor(() => {
      expect(screen.getByText("6")).toBeTruthy();
    });
  });
});

describe("LikeButton signed out", () => {
  beforeEach(() => {
    useSession.mockReturnValue({ isAuthenticated: false, user: null });
  });

  it("likes on this device without calling the server", () => {
    render(<LikeButton id="post_1" initialCount={3} />);
    expect(screen.getByRole("button", { name: "Like" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    expect(screen.getByRole("button", { name: "Unlike" })).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("join to sync")).toBeTruthy();
    expect(getLikeStatusAction).not.toHaveBeenCalled();
    expect(toggleLikeAction).not.toHaveBeenCalled();
  });
});
