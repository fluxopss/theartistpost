// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import {
  GET as getRsvp,
  POST as postRsvp,
} from "@/app/api/v1/events/[id]/rsvp/route";
import {
  GET as getCheckIn,
  POST as postCheckIn,
} from "@/app/api/v1/events/[id]/checkin/route";
import { GET as listMine } from "@/app/api/v1/me/rsvps/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const BASE = "http://localhost/api/v1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const me = userRow({ id: "user_me", email: "me@example.com", name: "Mia Member" });

const VENUE = { lat: 26.7131, lng: -80.0533 };

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    sourceId: null,
    title: "Opening Night",
    description: "",
    artist: "",
    medium: "community",
    startsAt: new Date("2026-10-30T22:00:00Z"),
    endsAt: new Date("2026-10-31T01:00:00Z"),
    timeZone: "America/New_York",
    venueName: "Hacienda",
    venueAddress: "522 Clematis St",
    latitude: VENUE.lat,
    longitude: VENUE.lng,
    capacity: 10,
    status: "PUBLISHED",
    coverImageUrl: null,
    comingSoon: false,
    createdById: "user_admin",
    publishedAt: new Date("2026-10-01T00:00:00Z"),
    cancelledAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

const at = (iso: string) => vi.setSystemTime(new Date(iso));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  at("2026-10-20T12:00:00Z");
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://theartistpost.fluxlab.agency");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function seats(sum: number | null, waitlisted = 0) {
  db.eventRsvp.aggregate.mockResolvedValue({ _sum: { party: sum } });
  db.eventRsvp.count.mockResolvedValue(waitlisted);
}

describe("POST /events/[id]/rsvp", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    postRsvp(jsonRequest(`${BASE}/events/evt_1/rsvp`, "POST", body, headers), ctx("evt_1"));

  it("requires a signed-in member", async () => {
    const res = await post({ status: "GOING" });
    expect(res.status).toBe(401);
  });

  it("holds seats and returns the pass code", async () => {
    db.event.findFirst.mockResolvedValue(eventRow());
    db.eventRsvp.findUnique.mockResolvedValue(null);
    seats(2);
    db.eventRsvp.upsert.mockImplementation(async (args: { create: Record<string, unknown> }) => ({
      id: "rsvp_1",
      eventId: "evt_1",
      userId: me.id,
      ...args.create,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const res = await post({ status: "GOING", party: 2, note: "  from the station " }, signInAs(me));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.rsvp).toMatchObject({
      eventId: "evt_1",
      status: "GOING",
      party: 2,
      waitlisted: false,
      note: "from the station",
    });
    expect(data.rsvp.passCode).toMatch(/^TAP-[0-9A-Z]{4}$/);
    expect(data.summary).toMatchObject({ capacity: 10, seatsTaken: 2 });

    const upsert = db.eventRsvp.upsert.mock.calls[0][0];
    expect(upsert.create.waitlistedAt).toBeNull();
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "event.rsvp", targetId: "evt_1" }),
      }),
    );
  });

  it("waitlists a party that does not fit", async () => {
    db.event.findFirst.mockResolvedValue(eventRow({ capacity: 10 }));
    db.eventRsvp.findUnique.mockResolvedValue(null);
    seats(9);
    db.eventRsvp.upsert.mockImplementation(async (args: { create: Record<string, unknown> }) => ({
      id: "rsvp_1",
      ...args.create,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const res = await post({ status: "GOING", party: 3 }, signInAs(me));
    const { data } = await res.json();
    expect(data.rsvp.waitlisted).toBe(true);
    expect(db.eventRsvp.upsert.mock.calls[0][0].create.waitlistedAt).toBeInstanceOf(Date);
  });

  it("counts only the seats other people hold when I change my own party", async () => {
    db.event.findFirst.mockResolvedValue(eventRow({ capacity: 10 }));
    db.eventRsvp.findUnique.mockResolvedValue({
      id: "rsvp_1",
      eventId: "evt_1",
      userId: me.id,
      status: "GOING",
      party: 4,
      note: null,
      waitlistedAt: null,
    });
    seats(6);
    db.eventRsvp.upsert.mockImplementation(async (args: { update: Record<string, unknown> }) => ({
      id: "rsvp_1",
      eventId: "evt_1",
      userId: me.id,
      note: null,
      ...args.update,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await post({ status: "GOING", party: 4 }, signInAs(me));
    expect(db.eventRsvp.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { not: me.id } }),
      }),
    );
  });

  it("promotes the waitlist and tells the person when seats free up", async () => {
    db.event.findFirst.mockResolvedValue(eventRow({ capacity: 4 }));
    db.eventRsvp.findUnique.mockResolvedValue({
      id: "rsvp_1",
      eventId: "evt_1",
      userId: me.id,
      status: "GOING",
      party: 3,
      note: null,
      waitlistedAt: null,
    });
    db.eventRsvp.upsert.mockResolvedValue({
      id: "rsvp_1",
      eventId: "evt_1",
      userId: me.id,
      status: "NOT_GOING",
      party: 3,
      note: null,
      waitlistedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Seat totals after I drop out: 0 confirmed, one person waiting.
    seats(0);
    db.eventRsvp.findMany.mockResolvedValue([
      { id: "rsvp_w", userId: "user_w", party: 2, waitlistedAt: new Date("2026-10-19T00:00:00Z") },
    ]);

    const res = await post({ status: "NOT_GOING" }, signInAs(me));
    expect(res.status).toBe(200);
    expect(db.eventRsvp.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["rsvp_w"] } }),
        data: { waitlistedAt: null },
      }),
    );
    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "user_w",
          type: "EVENT",
          targetKind: "event",
          targetRef: "evt_1",
        }),
      ],
    });
  });

  it("refuses a cancelled night, an ended night and an unknown night", async () => {
    db.event.findFirst.mockResolvedValueOnce(eventRow({ status: "CANCELLED" }));
    expect((await post({ status: "GOING" }, signInAs(me))).status).toBe(409);

    db.event.findFirst.mockResolvedValueOnce(
      eventRow({ endsAt: new Date("2026-10-19T00:00:00Z") }),
    );
    expect((await post({ status: "GOING" }, signInAs(me))).status).toBe(409);

    db.event.findFirst.mockResolvedValueOnce(null);
    expect((await post({ status: "GOING" }, signInAs(me))).status).toBe(404);
  });

  it("validates the body and the party size", async () => {
    db.event.findFirst.mockResolvedValue(eventRow());
    const bad = await post({ status: "GOING", party: 7 }, signInAs(me));
    expect(bad.status).toBe(400);
    const worse = await post({ status: "SURE" }, signInAs(me));
    expect(worse.status).toBe(400);
  });

  it("keeps suspended members read-only", async () => {
    const paused = userRow({ id: "user_paused", suspendedAt: new Date("2026-10-01T00:00:00Z") });
    const res = await post({ status: "GOING" }, signInAs(paused));
    expect(res.status).toBe(403);
  });
});

describe("GET /events/[id]/rsvp and /me/rsvps", () => {
  it("returns my response and the seat summary", async () => {
    db.event.findFirst.mockResolvedValue(eventRow());
    db.eventRsvp.findUnique.mockResolvedValue({
      id: "rsvp_1",
      eventId: "evt_1",
      userId: me.id,
      status: "MAYBE",
      party: 1,
      note: null,
      waitlistedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seats(3, 1);
    const res = await getRsvp(
      getRequest(`${BASE}/events/evt_1/rsvp`, signInAs(me)),
      ctx("evt_1"),
    );
    const { data } = await res.json();
    expect(data.rsvp.status).toBe("MAYBE");
    expect(data.summary).toMatchObject({ seatsTaken: 3, waitlisted: 1, seatsLeft: 7 });
  });

  it("lists my going/maybe nights with their event", async () => {
    db.eventRsvp.findMany.mockResolvedValue([
      {
        id: "rsvp_1",
        eventId: "evt_1",
        userId: me.id,
        status: "GOING",
        party: 2,
        note: null,
        waitlistedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        event: eventRow(),
      },
    ]);
    const res = await listMine(getRequest(`${BASE}/me/rsvps`, signInAs(me)));
    const { data } = await res.json();
    expect(data.items).toHaveLength(1);
    expect(data.items[0].rsvp.status).toBe("GOING");
    expect(data.items[0].event).toMatchObject({ id: "evt_1", source: "db" });
    expect(db.eventRsvp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: me.id, status: { in: ["GOING", "MAYBE"] }, event: { status: "PUBLISHED" } },
      }),
    );
  });
});

describe("check-in", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    postCheckIn(
      jsonRequest(`${BASE}/events/evt_1/checkin`, "POST", body, headers),
      ctx("evt_1"),
    );

  beforeEach(() => {
    at("2026-10-30T22:30:00Z"); // half an hour into the night
    db.event.findFirst.mockResolvedValue(eventRow());
    db.eventCheckIn.findUnique.mockResolvedValue(null);
    db.eventCheckIn.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "ci_1",
      checkedInAt: new Date(),
      ...args.data,
    }));
  });

  it("verifies a reading near the venue and stores only the verdict", async () => {
    const res = await post(
      { lat: VENUE.lat + 0.001, lng: VENUE.lng, accuracyM: 15 },
      signInAs(me),
    );
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.checkIn.verified).toBe(true);

    const created = db.eventCheckIn.create.mock.calls[0][0].data;
    expect(Object.keys(created).sort()).toEqual(["eventId", "userId", "verified"]);
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toMatch(/26\.71|80\.05|lat|lng/i);
    expect(JSON.stringify(data)).not.toMatch(/lat|lng/i);
  });

  it("marks a check-in without a reading unverified", async () => {
    const res = await post({}, signInAs(me));
    const { data } = await res.json();
    expect(data.checkIn.verified).toBe(false);
  });

  it("does not verify a reading far from the venue", async () => {
    const res = await post({ lat: VENUE.lat + 0.02, lng: VENUE.lng }, signInAs(me));
    const { data } = await res.json();
    expect(data.checkIn.verified).toBe(false);
  });

  it("upgrades an unverified check-in but never downgrades a verified one", async () => {
    db.eventCheckIn.findUnique.mockResolvedValue({
      id: "ci_1",
      eventId: "evt_1",
      userId: me.id,
      checkedInAt: new Date("2026-10-30T22:10:00Z"),
      verified: false,
    });
    db.eventCheckIn.update.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "ci_1",
      checkedInAt: new Date("2026-10-30T22:10:00Z"),
      ...args.data,
    }));
    const up = await post({ lat: VENUE.lat, lng: VENUE.lng }, signInAs(me));
    expect((await up.json()).data.checkIn.verified).toBe(true);
    expect(db.eventCheckIn.update).toHaveBeenCalledTimes(1);

    db.eventCheckIn.update.mockClear();
    db.eventCheckIn.findUnique.mockResolvedValue({
      id: "ci_1",
      eventId: "evt_1",
      userId: me.id,
      checkedInAt: new Date("2026-10-30T22:10:00Z"),
      verified: true,
    });
    const same = await post({}, signInAs(me));
    expect((await same.json()).data.checkIn.verified).toBe(true);
    expect(db.eventCheckIn.update).not.toHaveBeenCalled();
  });

  it("is closed before the doors window and after the night", async () => {
    at("2026-10-30T20:00:00Z");
    expect((await post({}, signInAs(me))).status).toBe(409);
    at("2026-10-31T02:00:00Z");
    expect((await post({}, signInAs(me))).status).toBe(409);
  });

  it("refuses a cancelled night and rejects half a coordinate", async () => {
    db.event.findFirst.mockResolvedValueOnce(eventRow({ status: "CANCELLED" }));
    expect((await post({}, signInAs(me))).status).toBe(409);
    const half = await post({ lat: 26.7 }, signInAs(me));
    expect(half.status).toBe(400);
  });

  it("reports where the window stands without ever asking for a location", async () => {
    db.eventCheckIn.findUnique.mockResolvedValue(null);
    const res = await getCheckIn(
      getRequest(`${BASE}/events/evt_1/checkin`, signInAs(me)),
      ctx("evt_1"),
    );
    const { data } = await res.json();
    expect(data).toMatchObject({ window: "open", checkIn: null, venueHasLocation: true });
  });
});
