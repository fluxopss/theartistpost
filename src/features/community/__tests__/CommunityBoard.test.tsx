import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));

import { CommunityBoard } from "../CommunityBoard";
import { makePost } from "./fixtures";

afterEach(cleanup);
beforeEach(() => webApi.mockReset());

const props = {
  initialItems: [makePost({ id: "p1" })],
  initialCursor: "p1",
  query: { scope: "all" as const, kind: "COLLAB" as const, topic: "murals" },
  gate: "ready" as const,
  viewerHandle: "vera",
};

describe("CommunityBoard", () => {
  it("loads the next page with the same filters and appends it", async () => {
    webApi.mockResolvedValue({ ok: true, data: { items: [makePost({ id: "p2", body: "second page" })], nextCursor: null } });
    render(<CommunityBoard {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(webApi).toHaveBeenCalledWith("/community?scope=all&kind=COLLAB&topic=murals&cursor=p1", { onUnauthorized: "return" });
    expect(await screen.findByText("second page")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });

  it("no more button when there is nothing else", () => {
    render(<CommunityBoard {...props} initialCursor={null} />);
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });

  it("a failed page keeps what is there and offers to retry", async () => {
    webApi.mockResolvedValue({ ok: false, status: 0, error: { code: "network", message: "Can't reach The Artist Post right now." } });
    render(<CommunityBoard {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(await screen.findByText(/can't reach/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show more/i })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("drops a post the author deletes", async () => {
    webApi.mockResolvedValue({ ok: true, data: { deleted: true } });
    render(<CommunityBoard {...props} initialItems={[makePost({ id: "p1", author: { handle: "vera", name: "Vera", avatarUrl: null, isArtist: false }, canDelete: true })]} />);
    await userEvent.click(screen.getByRole("button", { name: /more for this post/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /yes, delete/i }));
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  it("blocking someone removes all their posts from the board right away", async () => {
    webApi.mockResolvedValue({ ok: true, data: { blocked: true } });
    render(<CommunityBoard {...props} initialItems={[makePost({ id: "a1" }), makePost({ id: "a2" }), makePost({ id: "b1", author: { handle: "sam", name: "Sam", avatarUrl: null, isArtist: false } })]} />);
    await userEvent.click(screen.getAllByRole("button", { name: /more for this post/i })[0]!);
    await userEvent.click(screen.getByRole("menuitem", { name: /block @rae/i }));
    await userEvent.click(screen.getByRole("button", { name: /yes, block/i }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });
});
