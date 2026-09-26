import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ghl", () => ({
  sendLeadToGhl: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  content: {
    getEventById: vi.fn(),
  },
}));

import { content } from "@/lib/content";
import { sendLeadToGhl } from "@/lib/ghl";
import { passCode } from "@/features/night/rsvp";
import { POST } from "@/app/api/night/rsvp/route";

const sendLead = vi.mocked(sendLeadToGhl);
const getEventById = vi.mocked(content.getEventById);

const openEvent = {
  id: "e4",
  title: "Kindness Always Community Night",
  artist: "The Artist Post",
  medium: "community",
  start: "2099-09-26T16:00:00-04:00",
  end: "2099-09-26T21:00:00-04:00",
  venue: "Hacienda · 522 Clematis Street",
  description: "Test night",
};

function rsvpRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/night/rsvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/night/rsvp", () => {
  beforeEach(() => {
    sendLead.mockReset();
    getEventById.mockReset();
    getEventById.mockResolvedValue(openEvent);
  });

  it("mints a door pass only when GHL delivery succeeds", async () => {
    sendLead.mockResolvedValue({ ok: true });
    const response = await POST(
      rsvpRequest({
        eventId: "e4",
        name: "Ada",
        email: "ada@example.com",
        party: 2,
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      delivered: true,
      code: passCode("e4", "ada@example.com"),
    });
  });

  it("does not mint a success pass when ok and delivered are false for delivery", async () => {
    sendLead.mockResolvedValue({ ok: false, error: "webhook down" });
    const response = await POST(
      rsvpRequest({
        eventId: "e4",
        name: "Ada",
        email: "ada@example.com",
        party: 2,
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.delivered).toBe(false);
    expect(data.code).toBeUndefined();
    expect(data.error).toMatch(/not sent/i);
  });

  it("keeps party-size validation", async () => {
    const response = await POST(
      rsvpRequest({
        eventId: "e4",
        name: "Ada",
        email: "ada@example.com",
        party: 9,
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(sendLead).not.toHaveBeenCalled();
  });
});
