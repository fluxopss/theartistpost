import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adsTxt,
  adsenseClient,
  adsensePublisherId,
  adsenseScriptEnabled,
  adsenseScriptSrc,
} from "@/lib/adsense";
import { GET } from "@/app/ads.txt/route";

const ID = "pub-1234567890123456";

describe("AdSense config", () => {
  it("is fully off when no publisher ID is set", () => {
    expect(adsensePublisherId({})).toBeNull();
    expect(adsenseClient({})).toBeNull();
    expect(adsTxt({})).toBeNull();
    expect(adsenseScriptEnabled({ ADSENSE_AUTO_ADS: "1" })).toBe(false);
  });

  it("accepts pub- or ca-pub- and normalizes both", () => {
    expect(adsensePublisherId({ ADSENSE_PUBLISHER_ID: ID })).toBe(ID);
    expect(adsensePublisherId({ ADSENSE_PUBLISHER_ID: ` ca-${ID} ` })).toBe(ID);
    expect(adsenseClient({ ADSENSE_PUBLISHER_ID: ID })).toBe(`ca-${ID}`);
  });

  it("ignores a malformed ID instead of shipping a broken tag", () => {
    for (const bad of ["pub-", "pub-12ab", "ca-pub-1", "<script>", "pub-1234567890123456 x"]) {
      expect(adsensePublisherId({ ADSENSE_PUBLISHER_ID: bad })).toBeNull();
    }
  });

  it("links the site without loading ads until ADSENSE_AUTO_ADS=1", () => {
    expect(adsenseScriptEnabled({ ADSENSE_PUBLISHER_ID: ID })).toBe(false);
    expect(
      adsenseScriptEnabled({ ADSENSE_PUBLISHER_ID: ID, ADSENSE_AUTO_ADS: "1" }),
    ).toBe(true);
    expect(adsenseScriptSrc(`ca-${ID}`)).toBe(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${ID}`,
    );
  });

  it("writes Google's ads.txt line", () => {
    expect(adsTxt({ ADSENSE_PUBLISHER_ID: ID })).toBe(
      `google.com, ${ID}, DIRECT, f08c47fec0942fa0\n`,
    );
  });
});

describe("GET /ads.txt", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("404s while AdSense is off", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "");
    const res = GET();
    expect(res.status).toBe(404);
  });

  it("serves plain text once the publisher ID is set", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", `ca-${ID}`);
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await res.text()).toBe(`google.com, ${ID}, DIRECT, f08c47fec0942fa0\n`);
  });
});
