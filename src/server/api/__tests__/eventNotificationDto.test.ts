import { describe, expect, it } from "vitest";
import { toNotificationDTO } from "@/server/api/notifications";

describe("event notifications", () => {
  it("point at the night and have no actor", () => {
    const dto = toNotificationDTO({
      id: "n1",
      type: "EVENT",
      targetKind: "event",
      targetRef: "evt_1",
      preview: "Opening Night has been cancelled.",
      readAt: null,
      createdAt: new Date("2026-10-20T12:00:00Z"),
      actor: null,
    });
    expect(dto.type).toBe("EVENT");
    expect(dto.actor).toBeNull();
    expect(dto.target).toEqual({ kind: "event", id: "evt_1" });
    expect(dto.preview).toBe("Opening Night has been cancelled.");
  });
});
