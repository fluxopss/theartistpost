import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webApi = vi.fn();
const assign = vi.fn();
vi.mock("@/features/account/webApi", () => ({ webApi: (...a: unknown[]) => webApi(...a) }));

import { DeleteAccountForm } from "../DeleteAccountForm";

beforeEach(() => {
  webApi.mockReset();
  assign.mockReset();
  vi.stubGlobal("location", { ...window.location, assign });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeleteAccountForm", () => {
  it("stays disabled until the box says exactly DELETE", async () => {
    render(<DeleteAccountForm />);
    const button = screen.getByRole("button", { name: /delete my account/i });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type delete/i), "delete");
    expect(button).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/type delete/i));
    await userEvent.type(screen.getByLabelText(/type delete/i), "DELETE");
    expect(button).toBeEnabled();
  });

  it("deletes through the same endpoint as the app, then leaves with a full reload", async () => {
    webApi.mockResolvedValue({ ok: true, data: { deleted: true } });
    render(<DeleteAccountForm />);
    await userEvent.type(screen.getByLabelText(/type delete/i), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: /delete my account/i }));
    expect(webApi).toHaveBeenCalledWith("/me", { method: "DELETE", json: { confirm: "DELETE" } });
    expect(assign).toHaveBeenCalledWith("/?deleted=1");
  });

  it("shows the server's message and stays put when it fails", async () => {
    webApi.mockResolvedValue({ ok: false, status: 409, error: { code: "conflict", message: "Hand off admin first." } });
    render(<DeleteAccountForm />);
    await userEvent.type(screen.getByLabelText(/type delete/i), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: /delete my account/i }));
    expect(await screen.findByText("Hand off admin first.")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
