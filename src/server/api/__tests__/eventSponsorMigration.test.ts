// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION =
  "prisma/migrations/20261027180000_event_sponsor_vendors/migration.sql";

function sql(): string {
  return readFileSync(path.join(process.cwd(), MIGRATION), "utf8").replace(
    /--.*$/gm,
    "",
  );
}

function schemaEventModel(): string {
  const schema = readFileSync(
    path.join(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );
  const match = /model Event \{([\s\S]*?)\n\}/.exec(schema);
  return match?.[1] ?? "";
}

describe("Event sponsor + vendors migration", () => {
  it("only adds columns to Event (no drops, renames, deletes or rewrites)", () => {
    const text = sql();
    expect(text).not.toMatch(/\b(DROP|DELETE|TRUNCATE|RENAME|UPDATE|INSERT)\b/i);
    const statements = text
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);
    for (const s of statements) expect(s).toMatch(/^ALTER TABLE "Event"/);
  });

  it("adds three nullable sponsor columns and a NOT NULL vendors list defaulting to []", () => {
    const text = sql();
    for (const col of ["sponsorName", "sponsorUrl", "sponsorLogoUrl"]) {
      const re = new RegExp(`ADD COLUMN\\s+(?:IF NOT EXISTS\\s+)?"${col}"\\s+TEXT\\s*(,|$)`, "m");
      expect(text, col).toMatch(re);
    }
    expect(text).toMatch(
      /ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"vendors"\s+JSONB\s+NOT NULL\s+DEFAULT\s+jsonb_build_array\(\)/,
    );
  });

  it("matches the Prisma model", () => {
    const model = schemaEventModel();
    expect(model).toMatch(/\bsponsorName\s+String\?/);
    expect(model).toMatch(/\bsponsorUrl\s+String\?/);
    expect(model).toMatch(/\bsponsorLogoUrl\s+String\?/);
    expect(model).toMatch(/\bvendors\s+Json\s+@default\(dbgenerated\("jsonb_build_array\(\)"\)\)/);
  });

  it("has no field that holds money", () => {
    expect(schemaEventModel()).not.toMatch(/\b(price|fee|amount|cost|tier)\b/i);
    expect(sql()).not.toMatch(/\b(price|fee|amount|cost|tier)\b/i);
  });
});
