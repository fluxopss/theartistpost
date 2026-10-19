import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
const push = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push, replace: vi.fn() }) }));

import { Composer } from "../Composer";

const topics = [{ slug: "murals", name: "Murals", kind: "genre" as const }];

afterEach(cleanup);
beforeEach(() => {
  webApi.mockReset();
  push.mockReset();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:preview", revokeObjectURL: () => undefined }));
});

describe("Composer", () => {
  it("the kind's prompt guides the words", async () => {
    render(<Composer topics={topics} />);
    expect(screen.getByLabelText(/your post/i)).toHaveAttribute("placeholder", expect.stringMatching(/who are you lifting up/i));
    await userEvent.click(screen.getByRole("radio", { name: "Collab call" }));
    expect(screen.getByLabelText(/your post/i)).toHaveAttribute("placeholder", expect.stringMatching(/looking for/i));
  });

  it("posts kind, words and topic, then opens the new conversation", async () => {
    webApi.mockResolvedValue({ ok: true, data: { id: "new1" } });
    render(<Composer topics={topics} />);
    await userEvent.click(screen.getByRole("radio", { name: "Ask the house" }));
    await userEvent.type(screen.getByLabelText(/your post/i), "Who knows a good framer?");
    await userEvent.click(screen.getByRole("button", { name: "Murals" }));
    await userEvent.click(screen.getByRole("button", { name: /^post$/i }));
    expect(webApi).toHaveBeenCalledWith("/community", {
      method: "POST",
      json: { kind: "ASK", body: "Who knows a good framer?", topicSlug: "murals" },
    });
    expect(push).toHaveBeenCalledWith("/community/new1");
  });

  it("uploads the photo first, then posts with its URL", async () => {
    webApi
      .mockResolvedValueOnce({ ok: true, data: { url: "https://theartistpost.org/uploads/a.jpg" } })
      .mockResolvedValueOnce({ ok: true, data: { id: "new2" } });
    render(<Composer topics={topics} />);
    await userEvent.type(screen.getByLabelText(/your post/i), "New mural!");
    await userEvent.upload(screen.getByLabelText(/add a photo/i), new File(["x"], "a.jpg", { type: "image/jpeg" }));
    expect(screen.getByRole("img", { name: /the photo you attached/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^post$/i }));
    expect(webApi.mock.calls[0]![0]).toBe("/community/media");
    expect(webApi.mock.calls[1]![1]).toEqual({
      method: "POST",
      json: { kind: "SHOUTOUT", body: "New mural!", imageUrl: "https://theartistpost.org/uploads/a.jpg" },
    });
  });

  it("a photo that is too big is refused before upload and the words stay", async () => {
    render(<Composer topics={topics} />);
    await userEvent.type(screen.getByLabelText(/your post/i), "Keep me");
    await userEvent.upload(screen.getByLabelText(/add a photo/i), new File([new Uint8Array(3 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" }));
    expect(screen.getByText(/under 2.5MB/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your post/i)).toHaveValue("Keep me");
    expect(webApi).not.toHaveBeenCalled();
  });

  it("a failed post keeps everything and says why", async () => {
    webApi.mockResolvedValue({ ok: false, status: 400, error: { code: "validation_failed", message: "Check it", fields: { body: "Keep it under 500 characters." } } });
    render(<Composer topics={topics} />);
    await userEvent.type(screen.getByLabelText(/your post/i), "Hello");
    await userEvent.click(screen.getByRole("button", { name: /^post$/i }));
    expect(await screen.findByText("Keep it under 500 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText(/your post/i)).toHaveValue("Hello");
    expect(push).not.toHaveBeenCalled();
  });

  it("can't post nothing", () => {
    render(<Composer topics={topics} />);
    expect(screen.getByRole("button", { name: /^post$/i })).toBeDisabled();
  });
});
