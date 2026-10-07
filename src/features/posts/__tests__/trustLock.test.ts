import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
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
import {
  authorizePublisher,
  isMockGuestSession,
  NOT_AUTHORIZED_ERROR,
  resolvePostStatus,
} from "@/features/auth/publishGate";
import { MOCK_SESSION_USER } from "@/features/auth/mock-user";
import { POST } from "@/app/api/upload/route";
import type { SessionUser } from "@/features/auth/types";
import type { DbUserWithProfile } from "@/features/auth/publishGate";

describe("P1 — mock / unapproved cannot publish", () => {
  it("createPostAction refuses mock guest session", async () => {
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

  it("isMockGuestSession detects Studio Guest", () => {
    expect(isMockGuestSession(MOCK_SESSION_USER)).toBe(true);
    expect(isMockGuestSession(null)).toBe(true);
    expect(
      isMockGuestSession({
        id: "u1",
        name: "Real",
        email: "real@example.com",
        handle: "realartist",
        role: "ARTIST",
      }),
    ).toBe(false);
  });

  it("unapproved artist cannot pass authorizePublisher", () => {
    const session: SessionUser = {
      id: "u1",
      name: "Waiting",
      email: "waiting@example.com",
      handle: "waiting",
      role: "ARTIST",
    };
    const dbUser = {
      id: "u1",
      email: "waiting@example.com",
      name: "Waiting",
      image: null,
      role: "ARTIST" as const,
      supabaseAuthId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: {
        id: "ap1",
        userId: "u1",
        handle: "waiting",
        bio: null,
        avatarUrl: null,
        socialLinks: null,
        approved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } satisfies DbUserWithProfile;

    const gate = authorizePublisher(session, dbUser);
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.error).toBe(NOT_AUTHORIZED_ERROR);
  });

  it("approved artist path is unit-testable", () => {
    const session: SessionUser = {
      id: "u2",
      name: "Approved",
      email: "approved@example.com",
      handle: "approved",
      role: "ARTIST",
    };
    const dbUser = {
      id: "u2",
      email: "approved@example.com",
      name: "Approved",
      image: null,
      role: "ARTIST" as const,
      supabaseAuthId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: {
        id: "ap2",
        userId: "u2",
        handle: "approved",
        bio: null,
        avatarUrl: null,
        socialLinks: null,
        approved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } satisfies DbUserWithProfile;

    const gate = authorizePublisher(session, dbUser);
    expect(gate.ok).toBe(true);
    if (!gate.ok) return;
    expect(gate.canPublish).toBe(true);
    expect(resolvePostStatus("PUBLISHED", gate.canPublish)).toBe("PUBLISHED");
    expect(resolvePostStatus("DRAFT", gate.canPublish)).toBe("DRAFT");
  });

  it("ADMIN can publish without artist profile", () => {
    const session: SessionUser = {
      id: "admin1",
      name: "Ops",
      email: "ops@example.com",
      role: "ADMIN",
    };
    const dbUser = {
      id: "admin1",
      email: "ops@example.com",
      name: "Ops",
      image: null,
      role: "ADMIN" as const,
      supabaseAuthId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistProfile: null,
    } satisfies DbUserWithProfile;

    const gate = authorizePublisher(session, dbUser);
    expect(gate.ok).toBe(true);
  });
});

describe("P1 — upload still 403 for mock/anonymous", () => {
  it("returns 403 for mock guest session", async () => {
    const response = await POST(new Request("http://localhost/api/upload", { method: "POST" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/closed|approved/i);
  });
});

describe("seed catalog denylist + approved filter", () => {
  it("lists the six seed slugs and blocks midnight-filament", () => {
    expect(DENIED_POST_SLUGS).toHaveLength(6);
    expect(isDeniedPostSlug("midnight-filament")).toBe(true);
    expect(isDeniedPostSlug("paper-tide")).toBe(true);
    expect(isDeniedPostSlug("real-approved-work")).toBe(false);
  });

  it("blocks seed author emails and guest", () => {
    expect(DENIED_AUTHOR_EMAILS).toContain("luna@theartistpost.org");
    expect(DENIED_AUTHOR_EMAILS).toContain("guest@theartistpost.org");
    expect(isDeniedAuthorEmail("luna@theartistpost.org")).toBe(true);
    expect(isDeniedAuthorEmail("approved@theartistpost.org")).toBe(false);
  });

  it("public GET shape requires approved artist profile", () => {
    const where = publicCatalogWhere();
    expect(where.status).toBe("PUBLISHED");
    expect(where.slug.notIn).toContain("midnight-filament");
    expect(where.author.email.notIn).toContain("luna@theartistpost.org");
    expect(where.author.email.notIn).toContain("guest@theartistpost.org");
    expect(where.author.artistProfile.is.approved).toBe(true);
  });
});

describe("P1 — migration SQL", () => {
  it("adds approved column and AuditLog table", () => {
    const sqlPath = path.join(
      process.cwd(),
      "prisma/migrations/20260926120000_artist_approved_audit/migration.sql",
    );
    const sql = readFileSync(sqlPath, "utf8");
    expect(sql).toContain('"approved"');
    expect(sql).toContain("ArtistProfile");
    expect(sql).toContain("AuditLog");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "approved"/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "AuditLog"/);
  });
});
