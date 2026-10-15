import { describe, expect, it } from "vitest";
import {
  isDeniedPostSlug,
  publicCatalogWhere,
  TEST_HANDLE_PREFIX,
} from "@/features/posts/denylist";

describe("E2E seed denylist (W0)", () => {
  it("denies the prod E2E seed post slug", () => {
    expect(isDeniedPostSlug("e2e-seed-post-20261007")).toBe(true);
  });

  it("public catalog excludes the E2E seed slug", () => {
    const where = publicCatalogWhere();
    expect(where.slug.notIn).toContain("e2e-seed-post-20261007");
  });

  it("public catalog excludes E2E test artist handles", () => {
    expect(TEST_HANDLE_PREFIX).toBe("e2eart");
    const where = publicCatalogWhere();
    expect(where.author.artistProfile.is.handle).toEqual({
      not: { startsWith: "e2eart" },
    });
    expect(where.author.artistProfile.is.approved).toBe(true);
  });
});
