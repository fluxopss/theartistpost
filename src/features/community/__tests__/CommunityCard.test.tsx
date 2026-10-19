import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/account/webApi", () => ({ webApi: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));

import { CommunityCard } from "../CommunityCard";
import { makePost } from "./fixtures";

afterEach(cleanup);

describe("CommunityCard", () => {
  it("shows who, kind, topic, words with mentions, and opens the conversation", () => {
    render(<CommunityCard post={makePost()} gate="ready" />);
    expect(screen.getByRole("link", { name: /rae lin/i })).toHaveAttribute("href", "/u/rae");
    expect(screen.getByText("Shout-out")).toBeInTheDocument();
    expect(screen.getByText("Murals")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@robbi" })).toHaveAttribute("href", "/u/robbi");
    expect(screen.getByText("3h ago")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1 reply/i })).toHaveAttribute("href", "/community/p1");
  });

  it("shows a shared photo", () => {
    render(<CommunityCard post={makePost({ imageUrl: "/uploads/a.jpg" })} gate="ready" />);
    expect(screen.getByRole("img", { name: /photo shared by rae lin/i })).toHaveAttribute("src", "/uploads/a.jpg");
  });

  it("in its own conversation there is no reply link; replies are compact", () => {
    render(<CommunityCard post={makePost()} variant="thread" gate="ready" />);
    expect(screen.queryByRole("link", { name: /reply/i })).toBeNull();
    cleanup();
    render(<CommunityCard post={makePost({ parentId: "p0" })} variant="reply" gate="ready" />);
    expect(screen.queryByText("Shout-out")).toBeNull();
  });

  it("knows your own post", () => {
    render(<CommunityCard post={makePost({ canDelete: true })} gate="ready" viewerHandle="RAE" />);
    expect(screen.getByRole("button", { name: /more for this post/i })).toBeInTheDocument();
  });
});
