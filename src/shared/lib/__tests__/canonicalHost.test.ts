import { describe, expect, it } from "vitest";
import { canonicalRedirectTarget, isRedirectExemptPath } from "../canonicalHost";

const env = {
  canonicalHost: "theartistpost.org",
  legacyHosts: "theartistpost.fluxlab.agency",
};
const req = (over: Partial<{ host: string | null; method: string; pathname: string; search: string }> = {}) => ({
  host: "theartistpost.fluxlab.agency",
  method: "GET",
  pathname: "/about",
  search: "",
  ...over,
});

describe("canonicalRedirectTarget", () => {
  it("is inert when CANONICAL_HOST is unset", () => {
    expect(canonicalRedirectTarget(req(), {})).toBeNull();
    expect(canonicalRedirectTarget(req(), { canonicalHost: "  " })).toBeNull();
  });

  it("301s legacy page requests with path and query kept", () => {
    expect(canonicalRedirectTarget(req({ pathname: "/u/robbi", search: "?ref=x" }), env)).toBe(
      "https://theartistpost.org/u/robbi?ref=x",
    );
    expect(canonicalRedirectTarget(req({ pathname: "/" }), env)).toBe("https://theartistpost.org/");
  });

  it("sends www to the apex", () => {
    expect(canonicalRedirectTarget(req({ host: "www.theartistpost.org" }), env)).toBe(
      "https://theartistpost.org/about",
    );
  });

  it("never redirects the API, uploads or build assets (installed apps depend on them)", () => {
    for (const pathname of ["/api/v1/me", "/api", "/uploads/a.jpg", "/_next/static/x.js", "/.well-known/apple-app-site-association", "/sw.js"]) {
      expect(canonicalRedirectTarget(req({ pathname }), env)).toBeNull();
    }
    expect(isRedirectExemptPath("/apiary")).toBe(false);
  });

  it("only redirects GET and HEAD", () => {
    expect(canonicalRedirectTarget(req({ method: "POST" }), env)).toBeNull();
    expect(canonicalRedirectTarget(req({ method: "HEAD" }), env)).not.toBeNull();
  });

  it("serves the canonical host and unknown hosts as-is", () => {
    expect(canonicalRedirectTarget(req({ host: "theartistpost.org" }), env)).toBeNull();
    expect(canonicalRedirectTarget(req({ host: "theartistpost.org:443" }), env)).toBeNull();
    expect(canonicalRedirectTarget(req({ host: "evil.example" }), env)).toBeNull();
    expect(canonicalRedirectTarget(req({ host: null }), env)).toBeNull();
  });

  it("normalizes case and trailing dots", () => {
    expect(canonicalRedirectTarget(req({ host: "TheArtistPost.FluxLab.Agency." }), env)).toBe(
      "https://theartistpost.org/about",
    );
  });
});
