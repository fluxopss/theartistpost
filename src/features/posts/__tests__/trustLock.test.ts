import { describe, expect, it } from "vitest";
import {
  createPostAction,
  PUBLISHING_CLOSED_ERROR,
} from "@/features/posts/actions";
import {
  DENIED_AUTHOR_EMAILS,
  DENIED_POST_SLUGS,
  isDeniedAuthorEmail,
  isDeniedPostSlug,
  publicCatalogWhere,
} from "@/features/posts/denylist";
import { POST } from "@/app/api/upload/route";

describe("trust lock — createPostAction", () => {
  it("refuses create before any write", async () => {
    const result = await createPostAction({
      title: "Should not persist",
      tags: ["neon"],
      visibility: "PUBLISHED",
      mediaUrl: "https://example.com/still.webp",
      mediaType: "IMAGE",
      description: "Trust lock",
      layoutStyle: "framed",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe(PUBLISHING_CLOSED_ERROR);
  });
});

describe("trust lock — upload route", () => {
  it("returns 403 and does not accept uploads", async () => {
    const response = await POST();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/closed|approved/i);
  });
});

describe("seed catalog denylist", () => {
  it("lists the six seed slugs and blocks midnight-filament", () => {
    expect(DENIED_POST_SLUGS).toHaveLength(6);
    expect(isDeniedPostSlug("midnight-filament")).toBe(true);
    expect(isDeniedPostSlug("paper-tide")).toBe(true);
    expect(isDeniedPostSlug("real-approved-work")).toBe(false);
  });

  it("blocks seed author emails and guest, covering lunavoss author", () => {
    expect(DENIED_AUTHOR_EMAILS).toContain("luna@theartistpost.org");
    expect(DENIED_AUTHOR_EMAILS).toContain("guest@theartistpost.org");
    expect(isDeniedAuthorEmail("luna@theartistpost.org")).toBe(true);
    expect(isDeniedAuthorEmail("LUNA@theartistpost.org")).toBe(true);
    expect(isDeniedAuthorEmail("guest@theartistpost.org")).toBe(true);
    expect(isDeniedAuthorEmail("approved@theartistpost.org")).toBe(false);
  });

  it("public GET shape excludes midnight-filament and lunavoss author email", () => {
    const where = publicCatalogWhere();
    expect(where.status).toBe("PUBLISHED");
    expect(where.slug.notIn).toContain("midnight-filament");
    expect(where.author.email.notIn).toContain("luna@theartistpost.org");
    expect(where.author.email.notIn).toContain("guest@theartistpost.org");
  });
});
