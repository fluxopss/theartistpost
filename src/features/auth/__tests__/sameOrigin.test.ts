import { describe, expect, it } from "vitest";
import { isSameOriginWrite } from "../sameOrigin";

const env = { canonicalHost: "theartistpost.org", legacyHosts: "theartistpost.fluxlab.agency" };
type Input = Parameters<typeof isSameOriginWrite>[0];
const w = (o: Partial<Input>) =>
  isSameOriginWrite({ method: "POST", origin: null, referer: null, host: "theartistpost.org", ...o }, env);

describe("isSameOriginWrite", () => {
  it("always allows GET and HEAD", () => {
    expect(w({ method: "GET", origin: "https://evil.example" })).toBe(true);
    expect(w({ method: "head" })).toBe(true);
  });

  it("allows writes from the canonical, legacy and request host", () => {
    expect(w({ origin: "https://theartistpost.org" })).toBe(true);
    expect(w({ origin: "https://theartistpost.fluxlab.agency" })).toBe(true);
    expect(w({ origin: "http://localhost:3013", host: "localhost:3013" })).toBe(true);
  });

  it("works with the cutover env unset (request host only)", () => {
    expect(isSameOriginWrite({ method: "PATCH", origin: "https://theartistpost.org", referer: null, host: "theartistpost.org" }, {})).toBe(true);
    expect(isSameOriginWrite({ method: "PATCH", origin: "https://evil.example", referer: null, host: "theartistpost.org" }, {})).toBe(false);
  });

  it("rejects a foreign Origin, including look-alike suffixes", () => {
    expect(w({ origin: "https://evil.example" })).toBe(false);
    expect(w({ origin: "https://theartistpost.org.evil.example" })).toBe(false);
    expect(w({ origin: "https://eviltheartistpost.org" })).toBe(false);
  });

  it("falls back to Referer when Origin is missing", () => {
    expect(w({ referer: "https://theartistpost.org/settings" })).toBe(true);
    expect(w({ referer: "https://evil.example/x" })).toBe(false);
  });

  it("rejects a cookie write with neither Origin nor Referer", () => {
    expect(w({})).toBe(false);
  });

  it("rejects Origin: null and garbage", () => {
    expect(w({ origin: "null" })).toBe(false);
    expect(w({ origin: "not a url" })).toBe(false);
  });
});
