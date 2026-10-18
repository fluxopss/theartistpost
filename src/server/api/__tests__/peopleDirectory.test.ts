// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as peopleV1 } from "@/app/api/v1/people/route";
import { GET as followersV1 } from "@/app/api/v1/people/[handle]/followers/route";
import { GET as followingV1 } from "@/app/api/v1/people/[handle]/following/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { APP_REVIEW_HANDLE_PREFIX } from "@/features/posts/denylist";
import { visiblePersonWhere } from "@/server/api/people";
import { db, getRequest, resetDb, userRow } from "./testkit";

const BASE = "http://localhost/api/v1";

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetRateLimits();
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("App Review demo accounts and the public people directory", () => {
  it("uses the appreview- handle prefix", () => {
    expect(APP_REVIEW_HANDLE_PREFIX).toBe("appreview-");
  });

  it("keeps them out of the public directory listing", async () => {
    db.user.findMany.mockResolvedValue([]);
    await peopleV1(getRequest(`${BASE}/people`));
    expect(db.user.findMany.mock.calls[0]?.[0].where.AND).toContainEqual({
      NOT: { handle: { startsWith: "appreview-" } },
    });
  });

  it("keeps them reachable by handle so reviewers can use their own profile", () => {
    expect(JSON.stringify(visiblePersonWhere())).not.toContain("appreview-");
  });

  it("keeps them out of follower and following lists", async () => {
    const robbi = userRow({ id: "user_robbi", handle: "robbi" });
    const ctx = { params: Promise.resolve({ handle: "robbi" }) };
    for (const route of [followersV1, followingV1]) {
      db.user.findFirst.mockResolvedValue(robbi);
      db.follow.findMany.mockResolvedValue([]);
      await route(getRequest(`${BASE}/people/robbi/x`), ctx);
      const where = db.follow.findMany.mock.calls.at(-1)?.[0].where;
      const other = where.follower ?? where.following;
      expect(other.AND).toContainEqual({ NOT: { handle: { startsWith: "appreview-" } } });
      expect(JSON.stringify(other)).toContain("suspendedAt");
    }
  });
});
