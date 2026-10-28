// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = "prisma/migrations/20261027120000_culinary_artists_order/migration.sql";

function sql(): string {
  return readFileSync(path.join(process.cwd(), MIGRATION), "utf8");
}

/** Every `UPDATE "Topic" SET ... WHERE "slug" = '...'` as slug -> assignments. */
function updates(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /UPDATE\s+"Topic"\s+SET\s+([^;]+?)\s+WHERE\s+"slug"\s*=\s*'([a-z-]+)'\s*;/gi;
  for (const match of text.matchAll(re)) out.set(match[2]!, match[1]!);
  return out;
}

describe("Culinary Artists topic migration", () => {
  it("is data-only (no schema change, no deletes, no inserts)", () => {
    const text = sql().replace(/--.*$/gm, "");
    expect(text).not.toMatch(/\b(CREATE|ALTER|DROP|DELETE|INSERT|TRUNCATE)\b/i);
  });

  it("renames culinary to Culinary Artists and sorts it right after music", () => {
    const u = updates(sql());
    expect(u.get("culinary")).toMatch(/"name"\s*=\s*'Culinary Artists'/);
    expect(u.get("culinary")).toMatch(/"sortOrder"\s*=\s*3\b/);
    expect(u.get("music")).toMatch(/"sortOrder"\s*=\s*2\b/);
  });

  it("sets every curated topic to a fixed, unique order (idempotent)", () => {
    const u = updates(sql());
    const order = [
      "visual-art",
      "music",
      "culinary",
      "photo",
      "dance",
      "film",
      "stage",
      "laugh",
      "frame",
      "collabs",
      "gigs",
      "venues",
      "kindness",
    ];
    order.forEach((slug, i) => {
      expect(u.get(slug), slug).toMatch(new RegExp(`"sortOrder"\\s*=\\s*${i + 1}\\b`));
    });
    // Fixed values only: re-running sets the same numbers, never "sortOrder" + 1.
    expect(sql()).not.toMatch(/"sortOrder"\s*\+/);
  });
});
