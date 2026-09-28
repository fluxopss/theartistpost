import { describe, expect, it } from "vitest";
import { GET as getConfig } from "@/app/api/v1/app/config/route";
import { GET as getBootstrap } from "@/app/api/v1/content/bootstrap/route";
import { buildBootstrap, contentVersionOf } from "@/server/api/bootstrap";

/** Every string under a key named like a URL, anywhere in the payload. */
function collectUrls(value: unknown, out: string[] = [], key = ""): string[] {
  if (typeof value === "string") {
    if (/url$/i.test(key)) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, out, key));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectUrls(v, out, k);
  }
  return out;
}

describe("GET /api/v1/app/config", () => {
  it("returns the launch config with a five-minute public cache", async () => {
    const response = await getConfig();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        minSupportedVersion: "1.0.0",
        latestVersion: "1.0.0",
        flags: { wallCanvas: false, publishing: true, accounts: true },
        notices: [],
      },
    });
  });
});

describe("GET /api/v1/content/bootstrap", () => {
  it("serves site content with absolute URLs and a stable version", async () => {
    const response = await getBootstrap();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, stale-while-revalidate=86400",
    );
    const { ok, data } = await response.json();
    expect(ok).toBe(true);

    expect(data.contentVersion).toMatch(/^[0-9a-f]{12}$/);
    expect(data.contact.email).toBe("Robbie@theartistpost.org");
    expect(data.hours).toEqual({
      openMinutes: 540,
      closeMinutes: 1290,
      label: "9:00 AM – 9:30 PM",
      timeZone: "America/New_York",
    });
    expect(data.social.map((s: { id: string }) => s.id)).toContain("instagram");
    expect(data.donate.venmo).toBe("@theartistpost");
    expect(Array.isArray(data.chapters)).toBe(true);
    expect(Array.isArray(data.artists)).toBe(true);

    const urls = collectUrls(data);
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) expect(url).toMatch(/^https:\/\//);

    const again = await (await getBootstrap()).json();
    expect(again.data.contentVersion).toBe(data.contentVersion);
  });

  it("changes contentVersion when the content changes", async () => {
    const { contentVersion, ...payload } = await buildBootstrap();
    expect(contentVersionOf(payload)).toBe(contentVersion);
    expect(
      contentVersionOf({ ...payload, merchUrl: "https://example.com/new-shop" }),
    ).not.toBe(contentVersion);
  });
});
