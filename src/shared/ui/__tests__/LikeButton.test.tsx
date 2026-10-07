/**
 * @vitest-environment jsdom
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
      whileTap: _whileTap,
      ...rest
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      whileTap?: unknown;
      children?: ReactNode;
    }) => <button {...rest}>{children}</button>,
    span: ({
      children,
      initial: _initial,
      animate: _animate,
      ...rest
    }: HTMLAttributes<HTMLSpanElement> & {
      initial?: unknown;
      animate?: unknown;
      children?: ReactNode;
    }) => <span {...rest}>{children}</span>,
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
