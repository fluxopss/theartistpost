import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
const refresh = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));

import { ReplyBox } from "../ReplyBox";

afterEach(cleanup);
beforeEach(() => {
  webApi.mockReset();
  refresh.mockReset();
});

describe("ReplyBox", () => {
  it("replies one level deep with the parent's kind, then clears and refreshes", async () => {
    webApi.mockResolvedValue({ ok: true, data: { id: "r1" } });
    render(<ReplyBox parentId="p1" kind="ASK" gate="ready" />);
    await userEvent.type(screen.getByLabelText(/your reply/i), "  Happy to help!  ");
    await userEvent.click(screen.getByRole("button", { name: /^reply$/i }));
    expect(webApi).toHaveBeenCalledWith("/community", { method: "POST", json: { kind: "ASK", body: "Happy to help!", parentId: "p1" } });
    expect(screen.getByLabelText(/your reply/i)).toHaveValue("");
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the words when sending fails", async () => {
    webApi.mockResolvedValue({ ok: false, status: 429, error: { code: "rate_limited", message: "Slow down" } });
    render(<ReplyBox parentId="p1" kind="ASK" gate="ready" />);
    await userEvent.type(screen.getByLabelText(/your reply/i), "Keep me");
    await userEvent.click(screen.getByRole("button", { name: /^reply$/i }));
    expect(await screen.findByText(/try again in a moment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your reply/i)).toHaveValue("Keep me");
  });

  it("counts emoji as one character and stops at 500", async () => {
    render(<ReplyBox parentId="p1" kind="ASK" gate="ready" />);
    const box = screen.getByLabelText(/your reply/i);
    await userEvent.click(box);
    await userEvent.paste("👏".repeat(500));
    expect(screen.getByText("500/500")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reply$/i })).toBeEnabled();
    await userEvent.paste("👏");
    expect(screen.getByRole("button", { name: /^reply$/i })).toBeDisabled();
  });

  it("not ready: says how to take part instead of a box", () => {
    render(<ReplyBox parentId="p1" kind="ASK" gate="signedOut" here="/community/p1" />);
    expect(screen.queryByLabelText(/your reply/i)).toBeNull();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/join?door=return&next=%2Fcommunity%2Fp1");
  });
});
