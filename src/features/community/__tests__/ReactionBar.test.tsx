import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));

import { ReactionBar } from "../ReactionBar";
import { makePost } from "./fixtures";

afterEach(cleanup);
beforeEach(() => webApi.mockReset());

const state = (over = {}) => ({ ...makePost(), ...over });

describe("ReactionBar", () => {
  it("one tap gives Support, optimistically, then adopts the server's counts", async () => {
    let resolve!: (v: unknown) => void;
    webApi.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ReactionBar post={state()} gate="ready" />);
    await userEvent.click(screen.getByRole("button", { name: /^react/i }));
    expect(webApi).toHaveBeenCalledWith("/community/p1/reaction", { method: "PUT", json: { reaction: "SUPPORT" } });
    expect(screen.getByRole("button", { name: /you reacted with support/i })).toBeInTheDocument();
    await act(async () =>
      resolve({ ok: true, data: { viewerReaction: "SUPPORT", reactionCounts: { SUPPORT: 5, LOVE: 1, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 }, supportCount: 6, supported: true } }),
    );
    expect(screen.getByRole("link", { name: /6 reactions/i })).toHaveAttribute("href", "/community/p1/reactions");
  });

  it("tapping again takes the reaction back", async () => {
    webApi.mockResolvedValue({ ok: true, data: { viewerReaction: null, reactionCounts: { SUPPORT: 1, LOVE: 0, FIRE: 0, APPLAUSE: 0, INSPIRED: 0 }, supportCount: 1, supported: false } });
    render(<ReactionBar post={state({ viewerReaction: "LOVE", viewerSupported: true })} gate="ready" />);
    await userEvent.click(screen.getByRole("button", { name: /you reacted with love/i }));
    expect(webApi).toHaveBeenCalledWith("/community/p1/reaction", { method: "DELETE" });
  });

  it("the chooser sets any of the five reactions", async () => {
    webApi.mockResolvedValue({ ok: true, data: { viewerReaction: "FIRE", reactionCounts: { SUPPORT: 1, LOVE: 1, FIRE: 1, APPLAUSE: 0, INSPIRED: 0 }, supportCount: 3, supported: true } });
    render(<ReactionBar post={state()} gate="ready" />);
    await userEvent.click(screen.getByRole("button", { name: /choose a reaction/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /fire/i }));
    expect(webApi).toHaveBeenCalledWith("/community/p1/reaction", { method: "PUT", json: { reaction: "FIRE" } });
  });

  it("on failure reverts and explains, 429 says try again", async () => {
    webApi.mockResolvedValue({ ok: false, status: 429, error: { code: "rate_limited", message: "Slow" } });
    render(<ReactionBar post={state()} gate="ready" />);
    await userEvent.click(screen.getByRole("button", { name: /^react/i }));
    expect(await screen.findByText(/try again in a moment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^react/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /2 reactions/i })).toBeInTheDocument();
  });

  it("signed out: React is a sign-in link that comes back", () => {
    render(<ReactionBar post={state()} gate="signedOut" here="/community" />);
    expect(screen.getByRole("link", { name: /^react/i })).toHaveAttribute("href", "/join?door=return&next=%2Fcommunity");
  });

  it("not a member yet: points to Finish your profile", async () => {
    render(<ReactionBar post={state()} gate="needsProfile" />);
    await userEvent.click(screen.getByRole("button", { name: /^react/i }));
    expect(screen.getByRole("link", { name: /finish your profile/i })).toHaveAttribute("href", "/settings/profile");
    expect(webApi).not.toHaveBeenCalled();
  });
});
