import { describe, expect, it } from "vitest";
import {
  CHECKIN_LEAD_MS,
  CHECKIN_RADIUS_M,
  checkInWindow,
  decideSeats,
  haversineMeters,
  promoteFromWaitlist,
  verifyProximity,
} from "@/server/api/eventRules";

// 522 Clematis St, West Palm Beach (approximate venue point used only in tests).
const VENUE = { lat: 26.7131, lng: -80.0533 };

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters(VENUE, VENUE)).toBe(0);
  });

  it("measures ~111 m per 0.001 degree of latitude", () => {
    const d = haversineMeters(VENUE, { lat: VENUE.lat + 0.001, lng: VENUE.lng });
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(117);
  });
});

describe("verifyProximity", () => {
  it("verifies a reading within the radius", () => {
    expect(
      verifyProximity(VENUE, { lat: VENUE.lat + 0.001, lng: VENUE.lng }),
    ).toBe(true);
  });

  it("rejects a reading outside the radius", () => {
    const far = { lat: VENUE.lat + 0.005, lng: VENUE.lng }; // ~555 m
    expect(haversineMeters(VENUE, far)).toBeGreaterThan(CHECKIN_RADIUS_M);
    expect(verifyProximity(VENUE, far)).toBe(false);
  });

  it("never verifies without a reading or without venue coordinates", () => {
    expect(verifyProximity(VENUE, null)).toBe(false);
    expect(verifyProximity({ lat: null, lng: null }, VENUE)).toBe(false);
  });

  it("rejects a too-coarse reading even if it lands near the venue", () => {
    expect(verifyProximity(VENUE, { ...VENUE, accuracyM: 5000 })).toBe(false);
  });

  it("rejects out-of-range or non-finite coordinates", () => {
    expect(verifyProximity(VENUE, { lat: 91, lng: 0 })).toBe(false);
    expect(verifyProximity(VENUE, { lat: Number.NaN, lng: 0 })).toBe(false);
  });
});

describe("checkInWindow", () => {
  const event = {
    startsAt: new Date("2026-10-30T22:00:00Z"),
    endsAt: new Date("2026-10-31T01:00:00Z"),
  };

  it("is closed before the doors window", () => {
    const now = new Date(event.startsAt.getTime() - CHECKIN_LEAD_MS - 1);
    expect(checkInWindow(event, now)).toBe("before");
  });

  it("opens shortly before start and stays open until the end", () => {
    expect(
      checkInWindow(event, new Date(event.startsAt.getTime() - CHECKIN_LEAD_MS)),
    ).toBe("open");
    expect(checkInWindow(event, event.endsAt)).toBe("open");
  });

  it("closes after the end", () => {
    expect(
      checkInWindow(event, new Date(event.endsAt.getTime() + 1)),
    ).toBe("after");
  });
});

describe("decideSeats", () => {
  it("confirms when there is no capacity", () => {
    expect(decideSeats({ capacity: null, otherSeats: 500, party: 6 })).toBe(
      "confirmed",
    );
  });

  it("confirms when the party fits and waitlists when it does not", () => {
    expect(decideSeats({ capacity: 10, otherSeats: 6, party: 4 })).toBe(
      "confirmed",
    );
    expect(decideSeats({ capacity: 10, otherSeats: 7, party: 4 })).toBe(
      "waitlisted",
    );
  });
});

describe("promoteFromWaitlist", () => {
  const t = (n: number) => new Date(2026, 9, 1, 12, n);

  it("promotes in order while seats remain", () => {
    const ids = promoteFromWaitlist({
      capacity: 5,
      confirmedSeats: 2,
      waitlist: [
        { id: "a", party: 2, waitlistedAt: t(1) },
        { id: "b", party: 1, waitlistedAt: t(2) },
        { id: "c", party: 1, waitlistedAt: t(3) },
      ],
    });
    expect(ids).toEqual(["a", "b"]);
  });

  it("skips a party that does not fit so smaller ones behind it still get in", () => {
    const ids = promoteFromWaitlist({
      capacity: 4,
      confirmedSeats: 2,
      waitlist: [
        { id: "big", party: 5, waitlistedAt: t(1) },
        { id: "small", party: 2, waitlistedAt: t(2) },
      ],
    });
    expect(ids).toEqual(["small"]);
  });

  it("promotes nobody when capacity is full or unlimited has nothing waiting", () => {
    expect(
      promoteFromWaitlist({
        capacity: 3,
        confirmedSeats: 3,
        waitlist: [{ id: "a", party: 1, waitlistedAt: t(1) }],
      }),
    ).toEqual([]);
  });
});
