// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentEvent } from "@/lib/content";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

const fixtures = vi.hoisted(() => ({ events: [] as ContentEvent[] }));
vi.mock("@/lib/content", () => ({
  content: {
    getEvents: async () => fixtures.events,
    getEventById: async (id: string) =>
      fixtures.events.find((event) => event.id === id) ?? null,
  },
}));

const storeMock = vi.hoisted(() => ({ storeUploadedMedia: vi.fn() }));
vi.mock("@/server/api/media", async () => {
  const actual =
    await vi.importActual<typeof import("@/server/api/media")>(
      "@/server/api/media",
    );
  return { ...actual, storeUploadedMedia: storeMock.storeUploadedMedia };
});

import {
  GET as listEvents,
  POST as createEvent,
} from "@/app/api/v1/admin/events/route";
import {
  GET as getEvent,
  PATCH as patchEvent,
} from "@/app/api/v1/admin/events/[id]/route";
import { POST as publishEvent } from "@/app/api/v1/admin/events/[id]/publish/route";
import { POST as cancelEvent } from "@/app/api/v1/admin/events/[id]/cancel/route";
import { POST as duplicateEvent } from "@/app/api/v1/admin/events/[id]/duplicate/route";
import { GET as listRsvps } from "@/app/api/v1/admin/events/[id]/rsvps/route";
import { GET as listCheckIns } from "@/app/api/v1/admin/events/[id]/checkins/route";
import { POST as uploadCover } from "@/app/api/v1/admin/events/media/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const BASE = "http://localhost/api/v1/admin/events";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const admin = userRow({ id: "user_admin", role: "ADMIN", handle: "boss" });
const member = userRow({ id: "user_member" });

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    sourceId: null,
    title: "Opening Night",
    description: "Doors at six.",
    artist: "",
    medium: "community",
    startsAt: new Date("2026-10-30T22:00:00Z"),
    endsAt: new Date("2026-10-31T01:00:00Z"),
    timeZone: "America/New_York",
    venueName: "Hacienda",
    venueAddress: "522 Clematis St, West Palm Beach, FL",
    latitude: 26.7131,
    longitude: -80.0533,
    capacity: 80,
    status: "DRAFT",
    coverImageUrl: null,
    comingSoon: false,
    sponsorName: null,
    sponsorUrl: null,
    sponsorLogoUrl: null,
    vendors: [],
    createdById: "user_admin",
    publishedAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-10-15T00:00:00Z"),
    updatedAt: new Date("2026-10-15T00:00:00Z"),
    ...overrides,
  };
}

const VALID = {
  title: "  Opening Night ",
  description: "Doors at six.",
  startsAt: "2026-10-30T18:00",
  endsAt: "2026-10-30T21:00",
  venueName: "Hacienda",
  venueAddress: "522 Clematis St, West Palm Beach, FL",
  latitude: 26.7131,
  longitude: -80.0533,
  capacity: 80,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
  resetDb();
  resetRateLimits();
  fixtures.events = [];
  storeMock.storeUploadedMedia.mockReset();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://theartistpost.fluxlab.agency");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("admin gate", () => {
  it("is ADMIN only on every verb", async () => {
    const asMember = signInAs(member);
    expect((await listEvents(getRequest(BASE, asMember))).status).toBe(403);
    expect(
      (await createEvent(jsonRequest(BASE, "POST", VALID, signInAs(member)))).status,
    ).toBe(403);
    expect(
      (await publishEvent(jsonRequest(`${BASE}/evt_1/publish`, "POST", {}, signInAs(member)), ctx("evt_1"))).status,
    ).toBe(403);
    expect((await listEvents(getRequest(BASE))).status).toBe(401);
    expect(db.event.create).not.toHaveBeenCalled();
  });
});

describe("POST /admin/events", () => {
  it("creates a draft, reading times as house time", async () => {
    db.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data, id: "evt_new" }),
    );
    const res = await createEvent(jsonRequest(BASE, "POST", VALID, signInAs(admin)));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.event).toMatchObject({
      id: "evt_new",
      title: "Opening Night",
      publishState: "DRAFT",
      startsAtLocal: "2026-10-30T18:00",
      endsAtLocal: "2026-10-30T21:00",
    });

    const created = db.event.create.mock.calls[0][0].data;
    expect(created.startsAt.toISOString()).toBe("2026-10-30T22:00:00.000Z");
    expect(created.status).toBe("DRAFT");
    expect(created.createdById).toBe("user_admin");
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "event.create" }),
      }),
    );
  });

  it("rejects an end before the start, half a venue point and a foreign cover", async () => {
    const end = await createEvent(
      jsonRequest(BASE, "POST", { ...VALID, endsAt: "2026-10-30T17:00" }, signInAs(admin)),
    );
    expect(end.status).toBe(400);
    expect((await end.json()).error.fields.endsAt).toBeTruthy();

    const half = await createEvent(
      jsonRequest(BASE, "POST", { ...VALID, longitude: null }, signInAs(admin)),
    );
    expect(half.status).toBe(400);

    const cover = await createEvent(
      jsonRequest(
        BASE,
        "POST",
        { ...VALID, coverImageUrl: "https://evil.example/x.png" },
        signInAs(admin),
      ),
    );
    expect(cover.status).toBe(400);
    expect((await cover.json()).error.fields.coverImageUrl).toBeTruthy();
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("adopts a schedule night once, and says so when it is taken", async () => {
    fixtures.events = [
      {
        id: "e4",
        title: "Kindness Always Community Night",
        artist: "The Artist Post",
        medium: "community",
        start: "2026-09-26T16:00:00-04:00",
        end: "2026-09-26T21:00:00-04:00",
        venue: "Hacienda · 522 Clematis Street",
        description: "",
      },
    ];
    db.event.create.mockRejectedValueOnce(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );
    const res = await createEvent(
      jsonRequest(BASE, "POST", { ...VALID, sourceId: "e4" }, signInAs(admin)),
    );
    expect(res.status).toBe(409);

    const unknown = await createEvent(
      jsonRequest(BASE, "POST", { ...VALID, sourceId: "nope" }, signInAs(admin)),
    );
    expect(unknown.status).toBe(400);
  });
});

describe("GET /admin/events/[id]", () => {
  it("returns the night with its counts, or 404", async () => {
    db.event.findUnique.mockResolvedValueOnce(eventRow({ status: "PUBLISHED" }));
    const res = await getEvent(
      getRequest(`${BASE}/evt_1`, signInAs(admin)),
      ctx("evt_1"),
    );
    const { data } = await res.json();
    expect(data.event).toMatchObject({ id: "evt_1", publishState: "PUBLISHED" });
    expect(data.event.counts).toMatchObject({ going: 0, checkedIn: 0 });

    db.event.findUnique.mockResolvedValueOnce(null);
    const missing = await getEvent(
      getRequest(`${BASE}/nope`, signInAs(admin)),
      ctx("nope"),
    );
    expect(missing.status).toBe(404);
  });
});

describe("PATCH /admin/events/[id]", () => {
  const patch = (body: unknown) =>
    patchEvent(jsonRequest(`${BASE}/evt_1`, "PATCH", body, signInAs(admin)), ctx("evt_1"));

  beforeEach(() => {
    db.event.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ status: "PUBLISHED", ...args.data }),
    );
    db.eventRsvp.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
  });

  it("tells RSVPd people when the time or place of a published night changes", async () => {
    db.event.findUnique.mockResolvedValue(eventRow({ status: "PUBLISHED" }));
    const res = await patch({ startsAt: "2026-10-30T19:00" });
    expect(res.status).toBe(200);
    expect(db.notification.createMany).toHaveBeenCalledTimes(1);
    const rows = db.notification.createMany.mock.calls[0][0].data;
    expect(rows.map((r: { userId: string }) => r.userId)).toEqual(["u1", "u2"]);
    expect(rows[0]).toMatchObject({ type: "EVENT", targetKind: "event", targetRef: "evt_1" });
  });

  it("stays quiet for a description fix or an unpublished night", async () => {
    db.event.findUnique.mockResolvedValue(eventRow({ status: "PUBLISHED" }));
    await patch({ description: "Fixed a typo." });
    db.event.findUnique.mockResolvedValue(eventRow({ status: "DRAFT" }));
    await patch({ startsAt: "2026-10-30T19:00" });
    expect(db.notification.createMany).not.toHaveBeenCalled();
  });

  it("will not edit a cancelled night or an unknown one", async () => {
    db.event.findUnique.mockResolvedValueOnce(eventRow({ status: "CANCELLED" }));
    expect((await patch({ title: "New" })).status).toBe(409);
    db.event.findUnique.mockResolvedValueOnce(null);
    expect((await patch({ title: "New" })).status).toBe(404);
  });

  it("needs at least one field", async () => {
    db.event.findUnique.mockResolvedValue(eventRow());
    expect((await patch({})).status).toBe(400);
  });
});

describe("publish, cancel, duplicate", () => {
  it("publishes a draft and is a no-op the second time", async () => {
    db.event.findUnique.mockResolvedValueOnce(eventRow({ status: "DRAFT" }));
    db.event.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data }),
    );
    const res = await publishEvent(
      jsonRequest(`${BASE}/evt_1/publish`, "POST", {}, signInAs(admin)),
      ctx("evt_1"),
    );
    expect(res.status).toBe(200);
    expect(db.event.update.mock.calls[0][0].data).toMatchObject({ status: "PUBLISHED" });

    db.event.update.mockClear();
    db.event.findUnique.mockResolvedValueOnce(eventRow({ status: "PUBLISHED" }));
    const again = await publishEvent(
      jsonRequest(`${BASE}/evt_1/publish`, "POST", {}, signInAs(admin)),
      ctx("evt_1"),
    );
    expect(again.status).toBe(200);
    expect(db.event.update).not.toHaveBeenCalled();
  });

  it("cancels, then tells everyone who said going or maybe", async () => {
    db.event.findUnique.mockResolvedValueOnce(eventRow({ status: "PUBLISHED" }));
    db.event.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data }),
    );
    db.eventRsvp.findMany.mockResolvedValue([{ userId: "u1" }]);
    const res = await cancelEvent(
      jsonRequest(`${BASE}/evt_1/cancel`, "POST", {}, signInAs(admin)),
      ctx("evt_1"),
    );
    expect(res.status).toBe(200);
    expect(db.event.update.mock.calls[0][0].data).toMatchObject({ status: "CANCELLED" });
    const rows = db.notification.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(1);
    expect(rows[0].preview).toMatch(/cancelled/i);
  });

  it("duplicates as a fresh draft owned by the admin", async () => {
    db.event.findUnique.mockResolvedValueOnce(
      eventRow({ status: "PUBLISHED", sourceId: "e4", coverImageUrl: "/uploads/a.jpg" }),
    );
    db.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data, id: "evt_copy" }),
    );
    const res = await duplicateEvent(
      jsonRequest(`${BASE}/evt_1/duplicate`, "POST", {}, signInAs(admin)),
      ctx("evt_1"),
    );
    expect(res.status).toBe(201);
    const data = db.event.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      status: "DRAFT",
      sourceId: null,
      createdById: "user_admin",
      title: "Opening Night (copy)",
      coverImageUrl: "/uploads/a.jpg",
    });
    expect(data.publishedAt).toBeUndefined();
  });
});

describe("attendees and check-ins", () => {
  it("lists RSVPs for admins and exports CSV safely", async () => {
    db.event.findUnique.mockResolvedValue(eventRow({ status: "PUBLISHED" }));
    db.eventRsvp.findMany.mockResolvedValue([
      {
        id: "r1",
        eventId: "evt_1",
        userId: "u1",
        status: "GOING",
        party: 2,
        note: "=HYPERLINK(\"http://x\"), hi",
        waitlistedAt: null,
        createdAt: new Date("2026-10-16T00:00:00Z"),
        updatedAt: new Date("2026-10-16T00:00:00Z"),
        user: { id: "u1", name: "Ada \"Ace\" Lovelace", email: "ada@example.com" },
      },
    ]);
    db.eventCheckIn.findMany.mockResolvedValue([
      { userId: "u1", verified: true, checkedInAt: new Date("2026-10-30T22:05:00Z") },
    ]);

    const json = await listRsvps(
      getRequest(`${BASE}/evt_1/rsvps`, signInAs(admin)),
      ctx("evt_1"),
    );
    const { data } = await json.json();
    expect(data.items[0]).toMatchObject({
      name: expect.stringContaining("Ada"),
      email: "ada@example.com",
      status: "GOING",
      party: 2,
      checkedIn: true,
      verified: true,
    });
    expect(data.totals).toMatchObject({ goingSeats: 2, goingPeople: 1, checkedIn: 1 });

    const csv = await listRsvps(
      getRequest(`${BASE}/evt_1/rsvps?format=csv`, signInAs(admin)),
      ctx("evt_1"),
    );
    expect(csv.headers.get("Content-Type")).toContain("text/csv");
    const text = await csv.text();
    expect(text.split("\n")[0]).toBe(
      "name,email,status,seats,waitlisted,note,rsvp_at,checked_in,verified,checked_in_at",
    );
    expect(text).toContain('"Ada ""Ace"" Lovelace"');
    // A note that begins with = must not execute in a spreadsheet.
    expect(text).toContain("\"'=HYPERLINK(");
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "event.rsvps_export" }),
      }),
    );
  });

  it("shows who is checked in with a live count", async () => {
    db.event.findUnique.mockResolvedValue(eventRow({ status: "PUBLISHED" }));
    db.eventCheckIn.findMany.mockResolvedValue([
      {
        id: "c1",
        userId: "u1",
        verified: true,
        checkedInAt: new Date("2026-10-30T22:05:00Z"),
        user: { id: "u1", name: "Ada", handle: "ada" },
      },
      {
        id: "c2",
        userId: "u2",
        verified: false,
        checkedInAt: new Date("2026-10-30T22:09:00Z"),
        user: { id: "u2", name: "Grace", handle: "grace" },
      },
    ]);
    const res = await listCheckIns(
      getRequest(`${BASE}/evt_1/checkins`, signInAs(admin)),
      ctx("evt_1"),
    );
    const { data } = await res.json();
    expect(data).toMatchObject({ count: 2, verifiedCount: 1 });
    expect(data.items.map((i: { name: string }) => i.name)).toEqual(["Ada", "Grace"]);
  });
});

describe("GET /admin/events", () => {
  it("lists managed nights with counts and the schedule nights not yet adopted", async () => {
    fixtures.events = [
      {
        id: "e4",
        title: "Kindness Always Community Night",
        artist: "",
        medium: "community",
        start: "2026-11-26T16:00:00-05:00",
        end: "2026-11-26T21:00:00-05:00",
        venue: "Hacienda",
        description: "",
      },
      {
        id: "e5",
        title: "Adopted already",
        artist: "",
        medium: "community",
        start: "2026-11-27T16:00:00-05:00",
        end: "2026-11-27T21:00:00-05:00",
        venue: "Hacienda",
        description: "",
      },
    ];
    db.event.findMany.mockResolvedValue([
      eventRow({ status: "PUBLISHED" }),
      eventRow({ id: "evt_2", sourceId: "e5", status: "DRAFT" }),
    ]);
    db.eventRsvp.findMany.mockResolvedValue([
      { eventId: "evt_1", status: "GOING", party: 2, waitlistedAt: null },
      { eventId: "evt_1", status: "GOING", party: 3, waitlistedAt: null },
      { eventId: "evt_1", status: "GOING", party: 1, waitlistedAt: new Date() },
      { eventId: "evt_1", status: "MAYBE", party: 1, waitlistedAt: null },
    ]);
    db.eventCheckIn.findMany.mockResolvedValue([
      { eventId: "evt_1", verified: true },
      { eventId: "evt_1", verified: true },
      { eventId: "evt_1", verified: true },
      { eventId: "evt_1", verified: false },
    ]);

    const res = await listEvents(getRequest(BASE, signInAs(admin)));
    const { data } = await res.json();
    expect(data.items).toHaveLength(2);
    expect(data.items[0].counts).toMatchObject({
      going: 2,
      goingSeats: 5,
      waitlisted: 1,
      maybe: 1,
      checkedIn: 4,
      verified: 3,
    });
    expect(data.fromSchedule.map((e: { id: string }) => e.id)).toEqual(["e4"]);
  });
});

describe("POST /admin/events/media", () => {
  const upload = (file: File, headers: Record<string, string>) => {
    const form = new FormData();
    form.set("file", file);
    return uploadCover(
      new Request(`${BASE}/media`, { method: "POST", body: form, headers }),
    );
  };

  it("stores a cover photo through the shared upload path", async () => {
    storeMock.storeUploadedMedia.mockResolvedValueOnce({
      ok: true,
      media: {
        url: "/uploads/cover.jpg",
        absoluteUrl: "https://theartistpost.fluxlab.agency/uploads/cover.jpg",
        mediaType: "IMAGE",
        contentType: "image/jpeg",
        bytes: 10,
      },
    });
    const res = await upload(
      new File([new Uint8Array([0xff, 0xd8, 0xff])], "c.jpg", { type: "image/jpeg" }),
      signInAs(admin),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.url).toBe("/uploads/cover.jpg");
  });

  it("refuses video and non-admins", async () => {
    const video = await upload(
      new File([new Uint8Array([0])], "c.mp4", { type: "video/mp4" }),
      signInAs(admin),
    );
    expect(video.status).toBe(400);
    const denied = await upload(
      new File([new Uint8Array([0xff, 0xd8, 0xff])], "c.jpg", { type: "image/jpeg" }),
      signInAs(member),
    );
    expect(denied.status).toBe(403);
    expect(storeMock.storeUploadedMedia).not.toHaveBeenCalled();
  });
});

describe("sponsor and vendors (Phase 2)", () => {
  const SPONSOR = {
    sponsorName: "  Clematis Coffee ",
    sponsorUrl: "https://clematis.coffee/",
    sponsorLogoUrl: "/uploads/clematis-logo.png",
    vendors: [
      { name: " Taco Bus ", offering: "Street tacos", url: "https://taco.bus/" },
      { name: "Pie Lady", offering: "" },
    ],
  };
  const echoCreate = () =>
    db.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data, id: "evt_new" }),
    );
  const create = (body: unknown, as = admin) =>
    createEvent(jsonRequest(BASE, "POST", body, signInAs(as)));
  const patch = (body: unknown, as = admin) =>
    patchEvent(jsonRequest(`${BASE}/evt_1`, "PATCH", body, signInAs(as)), ctx("evt_1"));

  it("only admins can set them (acceptance 3: 403 for everyone else)", async () => {
    expect((await create({ ...VALID, ...SPONSOR }, member)).status).toBe(403);
    expect((await patch({ sponsorName: "Sneaky" }, member)).status).toBe(403);
    expect((await patch({ vendors: [{ name: "Sneaky" }] }, member)).status).toBe(403);
    const anon = await patchEvent(
      jsonRequest(`${BASE}/evt_1`, "PATCH", { sponsorName: "x" }),
      ctx("evt_1"),
    );
    expect(anon.status).toBe(401);
    expect(db.event.create).not.toHaveBeenCalled();
    expect(db.event.update).not.toHaveBeenCalled();
  });

  it("an admin creates a presented culinary night with vendors", async () => {
    echoCreate();
    const res = await create({ ...VALID, medium: "culinary", ...SPONSOR });
    expect(res.status).toBe(201);
    const data = db.event.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      medium: "culinary",
      sponsorName: "Clematis Coffee",
      sponsorUrl: "https://clematis.coffee/",
      sponsorLogoUrl: "/uploads/clematis-logo.png",
      vendors: [
        { name: "Taco Bus", offering: "Street tacos", url: "https://taco.bus/" },
        { name: "Pie Lady", offering: "", url: null },
      ],
    });
    const { data: body } = await res.json();
    expect(body.event).toMatchObject({
      sponsorName: "Clematis Coffee",
      sponsorUrl: "https://clematis.coffee/",
      sponsorLogoUrl: "https://theartistpost.fluxlab.agency/uploads/clematis-logo.png",
      vendors: [
        { name: "Taco Bus", offering: "Street tacos", url: "https://taco.bus/" },
        { name: "Pie Lady", offering: "", url: null },
      ],
    });
  });

  it("does not touch sponsor columns when a create leaves them out", async () => {
    echoCreate();
    expect((await create(VALID)).status).toBe(201);
    const data = db.event.create.mock.calls[0][0].data;
    for (const key of ["sponsorName", "sponsorUrl", "sponsorLogoUrl", "vendors"]) {
      expect(key in data, key).toBe(false);
    }
  });

  it("rejects http:, javascript: and foreign logos (acceptance 4)", async () => {
    for (const [body, field] of [
      [{ sponsorName: "C", sponsorUrl: "http://clematis.coffee/" }, "sponsorUrl"],
      [{ sponsorName: "C", sponsorUrl: "javascript:alert(1)" }, "sponsorUrl"],
      [{ sponsorName: "C", sponsorUrl: `https://x.example/${"a".repeat(300)}` }, "sponsorUrl"],
      [{ sponsorName: "C", sponsorLogoUrl: "https://elsewhere.example/logo.png" }, "sponsorLogoUrl"],
      [{ sponsorUrl: "https://clematis.coffee/" }, "sponsorUrl"],
      [{ sponsorLogoUrl: "/uploads/clematis-logo.png" }, "sponsorLogoUrl"],
      [{ sponsorName: "x".repeat(81) }, "sponsorName"],
      [{ vendors: [{ name: "Taco Bus", url: "http://taco.bus/" }] }, "vendors.0.url"],
      [{ vendors: [{ name: "Taco Bus", url: "javascript:alert(1)" }] }, "vendors.0.url"],
      [{ vendors: [{ name: "" }] }, "vendors.0.name"],
      [{ vendors: [{ name: "x".repeat(61) }] }, "vendors.0.name"],
      [{ vendors: [{ name: "Ok", offering: "y".repeat(81) }] }, "vendors.0.offering"],
      [{ vendors: Array.from({ length: 13 }, (_, i) => ({ name: `V${i}` })) }, "vendors"],
    ] as const) {
      const res = await create({ ...VALID, ...body });
      expect(res.status, JSON.stringify(body)).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("validation_failed");
      expect(Object.keys(json.error.fields ?? {}), JSON.stringify(body)).toContain(field);
    }
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("stores no money field, even if one is sent", async () => {
    echoCreate();
    await create({
      ...VALID,
      sponsorName: "C",
      price: 100,
      fee: 5,
      vendors: [{ name: "Taco Bus", price: 10, fee: 2, amount: 3 }],
    });
    const data = db.event.create.mock.calls[0][0].data;
    expect(JSON.stringify(data)).not.toMatch(/price|fee|amount/i);
  });

  it("limits a new night's medium to the house lanes plus community", async () => {
    echoCreate();
    expect((await create({ ...VALID, medium: "culinary" })).status).toBe(201);
    expect((await create({ ...VALID, medium: "community" })).status).toBe(201);
    const bad = await create({ ...VALID, medium: "crypto" });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.fields.medium).toBeDefined();
  });

  it("keeps an older night's medium editable as it is", async () => {
    db.event.findUnique.mockResolvedValue(eventRow({ medium: "visual" }));
    db.event.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ medium: "visual", ...args.data }),
    );
    expect((await patch({ medium: "visual", title: "Same lane" })).status).toBe(200);
    expect((await patch({ medium: "Visual" })).status).toBe(200);
    expect((await patch({ medium: "crypto" })).status).toBe(400);
  });

  it("removing the sponsor name removes the whole sponsor", async () => {
    db.event.findUnique.mockResolvedValue(
      eventRow({
        sponsorName: "Clematis Coffee",
        sponsorUrl: "https://clematis.coffee/",
        sponsorLogoUrl: "/uploads/clematis-logo.png",
      }),
    );
    db.event.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data }),
    );
    const res = await patch({ sponsorName: null });
    expect(res.status).toBe(200);
    expect(db.event.update.mock.calls[0][0].data).toMatchObject({
      sponsorName: null,
      sponsorUrl: null,
      sponsorLogoUrl: null,
    });
    // But a link with no name is refused.
    db.event.update.mockClear();
    expect((await patch({ sponsorName: null, sponsorUrl: "https://x.example/" })).status).toBe(400);
    expect(db.event.update).not.toHaveBeenCalled();
  });

  it("can clear the vendor list", async () => {
    db.event.findUnique.mockResolvedValue(eventRow({ vendors: [{ name: "Taco Bus" }] }));
    db.event.update.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data }),
    );
    expect((await patch({ vendors: [] })).status).toBe(200);
    expect(db.event.update.mock.calls[0][0].data.vendors).toEqual([]);
  });

  it("duplicating a night copies its sponsor and vendors", async () => {
    db.event.findUnique.mockResolvedValueOnce(
      eventRow({
        status: "PUBLISHED",
        medium: "culinary",
        sponsorName: "Clematis Coffee",
        sponsorUrl: "https://clematis.coffee/",
        sponsorLogoUrl: "/uploads/clematis-logo.png",
        vendors: [{ name: "Taco Bus", offering: "Tacos", url: null }],
      }),
    );
    db.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) =>
      eventRow({ ...args.data, id: "evt_copy" }),
    );
    const res = await duplicateEvent(
      jsonRequest(`${BASE}/evt_1/duplicate`, "POST", {}, signInAs(admin)),
      ctx("evt_1"),
    );
    expect(res.status).toBe(201);
    expect(db.event.create.mock.calls[0][0].data).toMatchObject({
      medium: "culinary",
      sponsorName: "Clematis Coffee",
      sponsorUrl: "https://clematis.coffee/",
      sponsorLogoUrl: "/uploads/clematis-logo.png",
      vendors: [{ name: "Taco Bus", offering: "Tacos", url: null }],
    });
  });

  it("reads explicit columns and keeps working before the migration", async () => {
    const p2022 = () =>
      Object.assign(new Error("The column `Event.sponsorName` does not exist"), { code: "P2022" });
    const base: Record<string, unknown> = eventRow();
    for (const key of ["sponsorName", "sponsorUrl", "sponsorLogoUrl", "vendors"]) {
      delete base[key];
    }

    db.event.findMany.mockRejectedValueOnce(p2022()).mockResolvedValueOnce([base]);
    const list = await listEvents(getRequest(BASE, signInAs(admin)));
    expect(list.status).toBe(200);
    expect((await list.json()).data.items[0]).toMatchObject({ id: "evt_1", sponsorName: null, vendors: [] });

    // Editing a plain field still saves; the retry uses the old columns.
    db.event.findUnique.mockRejectedValueOnce(p2022()).mockResolvedValueOnce(base);
    db.event.update
      .mockRejectedValueOnce(p2022())
      .mockImplementationOnce(async (args: { data: Record<string, unknown> }) => ({ ...base, ...args.data }));
    const edited = await patch({ title: "Renamed" });
    expect(edited.status).toBe(200);
    expect(db.event.update.mock.calls[1][0].select.sponsorName).toBeUndefined();

    // Saving a sponsor before the migration says so plainly instead of a 500.
    db.event.findUnique.mockResolvedValueOnce(eventRow());
    db.event.update.mockRejectedValue(p2022());
    const sponsor = await patch({ sponsorName: "Clematis Coffee" });
    expect(sponsor.status).toBe(409);
    expect((await sponsor.json()).error.message).toMatch(/sponsor/i);
  });
});
