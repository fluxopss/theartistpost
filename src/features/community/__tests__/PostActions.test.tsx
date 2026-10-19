import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
const refresh = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));

import { PostActions } from "../PostActions";
import { makePost } from "./fixtures";

afterEach(cleanup);
beforeEach(() => {
  webApi.mockReset();
  refresh.mockReset();
});

async function open() {
  await userEvent.click(screen.getByRole("button", { name: /more for this post/i }));
}

describe("PostActions", () => {
  it("reports with a reason and an optional note", async () => {
    webApi.mockResolvedValue({ ok: true, data: { id: "r1" } });
    render(<PostActions post={makePost()} gate="ready" />);
    await open();
    await userEvent.click(screen.getByRole("menuitem", { name: /report/i }));
    const send = screen.getByRole("button", { name: /send report/i });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: "Spam or scams" }));
    await userEvent.type(screen.getByLabelText(/anything else/i), "Same link 5 times");
    await userEvent.click(send);
    expect(webApi).toHaveBeenCalledWith("/reports", {
      method: "POST",
      json: { targetType: "COMMUNITY_POST", targetId: "p1", reason: "spam", note: "Same link 5 times" },
    });
    expect(await screen.findByText(/reviews reports within 24 hours/i)).toBeInTheDocument();
  });

  it("blocks the author after a confirm step", async () => {
    webApi.mockResolvedValue({ ok: true, data: { blocked: true } });
    render(<PostActions post={makePost()} gate="ready" />);
    await open();
    await userEvent.click(screen.getByRole("menuitem", { name: /block @rae/i }));
    expect(webApi).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /yes, block/i }));
    expect(webApi).toHaveBeenCalledWith("/blocks", { method: "POST", json: { handle: "rae" } });
    expect(refresh).toHaveBeenCalled();
  });

  it("your own post: delete after confirming, no block", async () => {
    const onDeleted = vi.fn();
    webApi.mockResolvedValue({ ok: true, data: { deleted: true } });
    render(<PostActions post={makePost({ canDelete: true })} gate="ready" isOwn onDeleted={onDeleted} />);
    await open();
    expect(screen.queryByRole("menuitem", { name: /block/i })).toBeNull();
    await userEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /yes, delete/i }));
    expect(webApi).toHaveBeenCalledWith("/community/p1", { method: "DELETE" });
    expect(onDeleted).toHaveBeenCalled();
  });

  it("signed out: report and block ask to sign in first", async () => {
    render(<PostActions post={makePost()} gate="signedOut" here="/community/p1" />);
    await open();
    expect(screen.getByRole("menuitem", { name: /sign in to report or block/i })).toHaveAttribute("href", "/join?door=return&next=%2Fcommunity%2Fp1");
  });

  it("the confirmation note can be dismissed and does not stay over the post", async () => {
    webApi.mockResolvedValue({ ok: true, data: { id: "r1" } });
    render(<PostActions post={makePost()} gate="ready" />);
    await open();
    await userEvent.click(screen.getByRole("menuitem", { name: /report/i }));
    await userEvent.click(screen.getByRole("radio", { name: "Spam or scams" }));
    await userEvent.click(screen.getByRole("button", { name: /send report/i }));
    expect(await screen.findByText(/reviews reports within 24 hours/i)).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText(/reviews reports within 24 hours/i)).toBeNull();
  });
});
