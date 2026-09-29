import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ghl", () => ({
  sendLeadToGhl: vi.fn(),
}));

import { sendLeadToGhl } from "@/lib/ghl";
import { submitDonorSteward } from "@/server/api/leads/donor";

const sendLead = vi.mocked(sendLeadToGhl);

describe("submitDonorSteward", () => {
  beforeEach(() => {
    sendLead.mockReset();
    sendLead.mockResolvedValue({ ok: true });
  });

  it("rejects invalid email", async () => {
    const outcome = await submitDonorSteward({ email: "not-an-email" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("invalid");
    expect(sendLead).not.toHaveBeenCalled();
  });

  it("posts one-time donor stewardship to GHL", async () => {
    const outcome = await submitDonorSteward({
      email: "friend@example.com",
      cadence: "one_time",
    });
    expect(outcome.ok).toBe(true);
    expect(sendLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "friend@example.com",
        intent: "donor",
        medium: "one_time",
        source: "theartistpost-donate",
        page: "/donate",
      }),
    );
  });

  it("maps monthly cadence for sustainer tagging", async () => {
    await submitDonorSteward({
      email: "sustainer@example.com",
      cadence: "monthly",
    });
    expect(sendLead).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "donor",
        medium: "monthly",
      }),
    );
  });
});
