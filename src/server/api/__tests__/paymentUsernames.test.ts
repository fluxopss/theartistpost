// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as getMeV1, PATCH as patchMeV1 } from "@/app/api/v1/me/route";
import { GET as personV1 } from "@/app/api/v1/people/[handle]/route";
import { GET as artistV1 } from "@/app/api/v1/artists/[handle]/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import {
  artistRow,
  db,
  getRequest,
  jsonRequest,
  resetDb,
  signInAs,
  userRow,
} from "./testkit";

const ME = "http://localhost/api/v1/me";
const BASE = "http://localhost/api/v1";
const handleCtx = (handle: string) => ({ params: Promise.resolve({ handle }) });

const paid = {
  venmoUsername: "robbie-art",
  cashAppTag: "robbieart",
  paypalMeUsername: "robbieart",
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tap.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PATCH /api/v1/me: payment usernames", () => {
  it("saves cleaned usernames for an artist", async () => {
    const artist = artistRow("robbie");
    const auth = signInAs(artist);
    db.user.findUnique.mockResolvedValueOnce({ ...artist, ...paid });

    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        {
          venmoUsername: "@robbie-art",
          cashAppTag: "https://cash.app/$robbieart",
          paypalMeUsername: "paypal.me/robbieart/10",
        },
        auth,
      ),
    );

    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: artist.id },
      data: paid,
    });
    const { data } = await response.json();
    expect(data.user).toMatchObject(paid);
  });

  it("clears a field with an empty string or null", async () => {
    const artist = artistRow("robbie", paid);
    const auth = signInAs(artist);
    db.user.findUnique.mockResolvedValueOnce({
      ...artist,
      venmoUsername: null,
      cashAppTag: null,
    });

    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { venmoUsername: "", cashAppTag: null }, auth),
    );

    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]?.[0].data).toEqual({
      venmoUsername: null,
      cashAppTag: null,
    });
  });

  it("leaves untouched fields alone", async () => {
    const artist = artistRow("robbie", paid);
    const auth = signInAs(artist);
    db.user.findUnique.mockResolvedValueOnce(artist);

    await patchMeV1(
      jsonRequest(ME, "PATCH", { venmoUsername: "other-name" }, auth),
    );

    expect(db.user.update.mock.calls[0]?.[0].data).toEqual({
      venmoUsername: "other-name",
    });
  });

  it("answers 400 with a friendly message per bad field", async () => {
    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        { venmoUsername: "no", cashAppTag: "1abc", paypalMeUsername: "a b" },
        signInAs(artistRow("robbie")),
      ),
    );

    expect(response.status).toBe(400);
    const { error } = await response.json();
    expect(error.code).toBe("validation_failed");
    expect(error.fields.venmoUsername).toMatch(/venmo/i);
    expect(error.fields.cashAppTag).toMatch(/cash app/i);
    expect(error.fields.paypalMeUsername).toMatch(/paypal/i);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("points a wrong-service link at the right field", async () => {
    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        { venmoUsername: "https://cash.app/$robbieart" },
        signInAs(artistRow("robbie")),
      ),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.venmoUsername).toMatch(
      /cash app/i,
    );
  });

  it("refuses members with a clear 403 and writes nothing", async () => {
    const response = await patchMeV1(
      jsonRequest(
        ME,
        "PATCH",
        { venmoUsername: "robbie-art" },
        signInAs(userRow()),
      ),
    );

    expect(response.status).toBe(403);
    const { error } = await response.json();
    expect(error.code).toBe("forbidden");
    expect(error.message).toMatch(/artist/i);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("lets a member clear leftover values (never blocked from removing)", async () => {
    const member = userRow({ id: "user_exartist", handle: "exartist" });
    const auth = signInAs(member);
    db.user.findUnique.mockResolvedValueOnce(member);

    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { venmoUsername: "" }, auth),
    );
    expect(response.status).toBe(200);
    expect(db.user.update.mock.calls[0]?.[0].data).toEqual({
      venmoUsername: null,
    });
  });

  it("allows admins", async () => {
    const admin = userRow({ id: "user_admin", role: "ADMIN", handle: "boss" });
    const auth = signInAs(admin);
    db.user.findUnique.mockResolvedValueOnce({ ...admin, ...paid });

    const response = await patchMeV1(
      jsonRequest(ME, "PATCH", { cashAppTag: "robbieart" }, auth),
    );
    expect(response.status).toBe(200);
  });

  it("audits that payment links changed, without storing the values", async () => {
    const artist = artistRow("robbie");
    const auth = signInAs(artist);
    db.user.findUnique.mockResolvedValueOnce({ ...artist, ...paid });

    await patchMeV1(
      jsonRequest(ME, "PATCH", { venmoUsername: "robbie-art" }, auth),
    );

    const audit = db.auditLog.create.mock.calls.at(-1)?.[0].data;
    expect(audit.action).toBe("user.profile_update");
    expect(audit.meta).toMatchObject({ paymentLinks: true });
    expect(JSON.stringify(audit.meta)).not.toContain("robbie-art");
  });
});

describe("GET /api/v1/me: payment usernames", () => {
  it("returns the owner's stored usernames (null when unset)", async () => {
    const artist = artistRow("robbie", { venmoUsername: "robbie-art" });
    const response = await getMeV1(getRequest(ME, signInAs(artist)));
    const { data } = await response.json();
    expect(data.user.venmoUsername).toBe("robbie-art");
    expect(data.user.cashAppTag).toBeNull();
    expect(data.user.paypalMeUsername).toBeNull();
  });
});

describe("GET /api/v1/people/[handle]: paymentLinks", () => {
  it("lists server-built https links for an approved artist", async () => {
    db.user.findFirst.mockResolvedValue(artistRow("robbie", paid));

    const response = await personV1(
      getRequest(`${BASE}/people/robbie`),
      handleCtx("robbie"),
    );
    const { data } = await response.json();

    expect(data.paymentLinks).toEqual([
      { service: "venmo", label: "Venmo", url: "https://venmo.com/u/robbie-art" },
      { service: "cashapp", label: "Cash App", url: "https://cash.app/$robbieart" },
      { service: "paypalme", label: "PayPal", url: "https://paypal.me/robbieart" },
    ]);
    for (const link of data.paymentLinks) {
      expect(link.url.startsWith("https://")).toBe(true);
    }
  });

  it("is an empty array for a plain member", async () => {
    db.user.findFirst.mockResolvedValue(userRow({ id: "user_m", ...paid }));
    const { data } = await (
      await personV1(getRequest(`${BASE}/people/m`), handleCtx("m"))
    ).json();
    expect(data.paymentLinks).toEqual([]);
  });

  it("is empty for a suspended artist even if a row slipped through", async () => {
    db.user.findFirst.mockResolvedValue(
      artistRow("robbie", { ...paid, suspendedAt: new Date() }),
    );
    const { data } = await (
      await personV1(getRequest(`${BASE}/people/robbie`), handleCtx("robbie"))
    ).json();
    expect(data.paymentLinks).toEqual([]);
  });

  it("is empty for e2eart test handles", async () => {
    db.user.findFirst.mockResolvedValue(artistRow("e2eart-pay", paid));
    const { data } = await (
      await personV1(
        getRequest(`${BASE}/people/e2eart-pay`),
        handleCtx("e2eart-pay"),
      )
    ).json();
    expect(data.paymentLinks).toEqual([]);
  });

  it("is empty for an artist who is not approved yet", async () => {
    db.user.findFirst.mockResolvedValue(artistRow("robbie", paid, false));
    const { data } = await (
      await personV1(getRequest(`${BASE}/people/robbie`), handleCtx("robbie"))
    ).json();
    expect(data.paymentLinks).toEqual([]);
  });
});

describe("GET /api/v1/artists/[handle]: paymentLinks", () => {
  function profileFor(user: ReturnType<typeof artistRow>) {
    const { artistProfile, ...rest } = user;
    return { ...artistProfile!, user: rest };
  }

  it("includes paymentLinks on the artist payload", async () => {
    db.artistProfile.findUnique.mockResolvedValue(
      profileFor(artistRow("robbie", { ...paid, venmoUsername: null })),
    );
    const response = await artistV1(
      getRequest(`${BASE}/artists/robbie`),
      handleCtx("robbie"),
    );
    const { data } = await response.json();
    expect(data.artist.paymentLinks).toEqual([
      { service: "cashapp", label: "Cash App", url: "https://cash.app/$robbieart" },
      { service: "paypalme", label: "PayPal", url: "https://paypal.me/robbieart" },
    ]);
  });

  it("is an empty array for a suspended artist", async () => {
    db.artistProfile.findUnique.mockResolvedValue(
      profileFor(artistRow("robbie", { ...paid, suspendedAt: new Date() })),
    );
    const { data } = await (
      await artistV1(getRequest(`${BASE}/artists/robbie`), handleCtx("robbie"))
    ).json();
    expect(data.artist.paymentLinks).toEqual([]);
  });

  it("is an empty array when no usernames are set", async () => {
    db.artistProfile.findUnique.mockResolvedValue(
      profileFor(artistRow("robbie")),
    );
    const { data } = await (
      await artistV1(getRequest(`${BASE}/artists/robbie`), handleCtx("robbie"))
    ).json();
    expect(data.artist.paymentLinks).toEqual([]);
  });
});
