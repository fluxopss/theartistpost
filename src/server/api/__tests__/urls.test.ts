import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  externalUrl,
  FALLBACK_SITE_URL,
  siteOrigin,
} from "@/server/api/urls";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("absoluteUrl", () => {
  it("resolves media and brand paths against NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.org/");
    expect(absoluteUrl("/uploads/abc.webp")).toBe(
      "https://staging.example.org/uploads/abc.webp",
    );
    expect(absoluteUrl("/brand/logo.webp")).toBe(
      "https://staging.example.org/brand/logo.webp",
    );
    expect(absoluteUrl("/merch/gallery.webp")).toBe(
      "https://staging.example.org/merch/gallery.webp",
    );
  });

  it("uses only the origin of the configured site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.org/some/path");
    expect(siteOrigin()).toBe("https://staging.example.org");
  });

  it("falls back to the production host when unset or malformed", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteOrigin()).toBe(FALLBACK_SITE_URL);
    expect(absoluteUrl("/brand/logo.webp")).toBe(
      "https://theartistpost.fluxlab.agency/brand/logo.webp",
    );
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url");
    expect(siteOrigin()).toBe(FALLBACK_SITE_URL);
  });

  it("passes absolute http(s) URLs through", () => {
    expect(absoluteUrl("https://cdn.example.com/a.mp4")).toBe(
      "https://cdn.example.com/a.mp4",
    );
  });

  it("returns null for empty values and non-http schemes", () => {
    expect(absoluteUrl(null)).toBeNull();
    expect(absoluteUrl(undefined)).toBeNull();
    expect(absoluteUrl("   ")).toBeNull();
    expect(absoluteUrl("javascript:alert(1)")).toBeNull();
    expect(absoluteUrl("data:image/png;base64,AAAA")).toBeNull();
  });
});

describe("externalUrl", () => {
  it("keeps only absolute http(s) links", () => {
    expect(externalUrl("https://instagram.com/someone")).toBe(
      "https://instagram.com/someone",
    );
    expect(externalUrl("instagram.com/someone")).toBeNull();
    expect(externalUrl("/uploads/x.webp")).toBeNull();
    expect(externalUrl("mailto:a@example.com")).toBeNull();
    expect(externalUrl(42)).toBeNull();
  });
});
