// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/prisma", async () => {
  const kit = await import("./testkit");
  return { getPrisma: () => kit.getTestPrisma() };
});

import { GET as peopleV1 } from "@/app/api/v1/people/route";
import { resetRateLimits } from "@/features/auth/rateLimit";
import { APP_REVIEW_HANDLE_PREFIX } from "@/features/posts/denylist";
import { visiblePersonWhere } from "@/server/api/people";
import { db, getRequest, resetDb } from "./testkit";

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
});
