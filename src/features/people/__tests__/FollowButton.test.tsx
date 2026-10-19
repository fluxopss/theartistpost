import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));

import { FollowBar } from "../FollowButton";

const base = {
  handle: "rae",
  initialFollowing: false,
  initialFollowerCount: 4,
  followingCount: 2,
  postCount: 7,
  signedIn: true,
  isSelf: false,
  followsViewer: false,
};

afterEach(cleanup);
beforeEach(() => webApi.mockReset());

describe("FollowBar", () => {
  it("links the counts to the follower and following lists", () => {
    render(<FollowBar {...base} />);
    expect(screen.getByRole("link", { name: /4 followers/i })).toHaveAttribute("href", "/u/rae/followers");
    expect(screen.getByRole("link", { name: /2 following/i })).toHaveAttribute("href", "/u/rae/following");
    expect(screen.getByText(/7 posts/i)).toBeInTheDocument();
  });

  it("signed out: Follow is a sign-in link that comes back here", () => {
    render(<FollowBar {...base} signedIn={false} />);
    expect(screen.getByRole("link", { name: "Follow" })).toHaveAttribute("href", "/join?door=return&next=%2Fu%2Frae");
  });

  it("optimistically flips, then adopts the server's following and count", async () => {
    let resolve!: (v: unknown) => void;
    webApi.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<FollowBar {...base} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /5 followers/i })).toBeInTheDocument();
    await act(async () => resolve({ ok: true, data: { following: true, followerCount: 9 } }));
    expect(screen.getByRole("link", { name: /9 followers/i })).toBeInTheDocument();
    expect(webApi).toHaveBeenCalledWith("/people/rae/follow", { method: "POST" });
  });

  it("on 429 reverts and says to try again", async () => {
    webApi.mockResolvedValue({ ok: false, status: 429, error: { code: "rate_limited", message: "Slow down" } });
    render(<FollowBar {...base} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(await screen.findByText(/try again in a moment/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("link", { name: /4 followers/i })).toBeInTheDocument();
  });

  it("ignores clicks while a request is in flight", async () => {
    let resolve!: (v: unknown) => void;
    webApi.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<FollowBar {...base} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    await userEvent.click(screen.getByRole("button", { name: "Following" }));
    expect(webApi).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, data: { following: true, followerCount: 5 } }));
  });

  it("your own profile shows Edit profile instead of Follow", () => {
    render(<FollowBar {...base} isSelf />);
    expect(screen.queryByRole("button", { name: /follow/i })).toBeNull();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/settings/profile");
  });

  it("shows a 'Follows you' pill", () => {
    render(<FollowBar {...base} followsViewer />);
    expect(screen.getByText("Follows you")).toBeInTheDocument();
  });

  it("uses singular wording for one follower", () => {
    render(<FollowBar {...base} initialFollowerCount={1} />);
    expect(screen.getByRole("link", { name: /1 follower$/i })).toBeInTheDocument();
  });

  it("when the profile isn't finished yet, points to Edit profile instead of a dead end", async () => {
    webApi.mockResolvedValue({ ok: false, status: 403, error: { code: "forbidden", message: "Finish your profile and accept the Community Guidelines first." } });
    render(<FollowBar {...base} />);
    await userEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(await screen.findByRole("link", { name: /finish your profile/i })).toHaveAttribute("href", "/settings/profile");
  });
});
