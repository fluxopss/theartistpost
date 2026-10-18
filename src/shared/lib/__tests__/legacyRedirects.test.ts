import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../../../next.config";
import { LEGACY_REDIRECTS } from "../legacyRedirects";

const APP_DIR = path.resolve(__dirname, "../../../app");
const pageExists = (route: string) =>
  existsSync(path.join(APP_DIR, route.replace(/^\//, ""), "page.tsx"));

describe("legacy theartistpost.org redirects", () => {
  it("covers the 20 GoDaddy-era URLs with unique sources", () => {
    const sources = LEGACY_REDIRECTS.map((r) => r.source);
    expect(sources).toHaveLength(20);
    expect(new Set(sources).size).toBe(20);
  });

  it("never sends anyone to the home page", () => {
    for (const r of LEGACY_REDIRECTS) expect(r.destination.split("?")[0]).not.toBe("/");
  });

  it("only redirects to pages that exist", () => {
    for (const r of LEGACY_REDIRECTS) {
      expect(pageExists(r.destination.split("?")[0]), r.destination).toBe(true);
    }
  });

  it("never shadows a page that already exists here", () => {
    for (const r of LEGACY_REDIRECTS) expect(pageExists(r.source), r.source).toBe(false);
  });

  it("sends the retired paid pages only to the free join or partner door", () => {
    const paid = LEGACY_REDIRECTS.filter((r) =>
      ["/advertise-with-tap", "/membership"].includes(r.source),
    );
    expect(paid).toHaveLength(2);
    for (const r of paid) {
      expect(["/join", "/get-involved?door=partner"]).toContain(r.destination);
    }
  });

  it("is wired into next.config as permanent redirects", async () => {
    const all = (await nextConfig.redirects?.()) ?? [];
    for (const r of LEGACY_REDIRECTS) {
      expect(all).toContainEqual({ ...r, permanent: true });
    }
  });
});
