import { describe, expect, it } from "vitest";
import { gaMeasurementId, googleSiteVerification } from "@/lib/google";

const TOKEN = "AbC-dEf_0123456789abcdefGHIJKLMNOPQRSTUVWXYZ";

describe("googleSiteVerification", () => {
  it("is off when unset or blank", () => {
    expect(googleSiteVerification({})).toBeNull();
    expect(googleSiteVerification({ GOOGLE_SITE_VERIFICATION: "  " })).toBeNull();
  });

  it("accepts the bare token", () => {
    expect(googleSiteVerification({ GOOGLE_SITE_VERIFICATION: ` ${TOKEN} ` })).toBe(TOKEN);
  });

  it("accepts the whole meta tag pasted from Search Console", () => {
    const tag = `<meta name="google-site-verification" content="${TOKEN}" />`;
    expect(googleSiteVerification({ GOOGLE_SITE_VERIFICATION: tag })).toBe(TOKEN);
  });

  it("rejects junk that could break the tag", () => {
    expect(googleSiteVerification({ GOOGLE_SITE_VERIFICATION: "short" })).toBeNull();
    expect(
      googleSiteVerification({ GOOGLE_SITE_VERIFICATION: `${TOKEN}"><script>` }),
    ).toBeNull();
  });
});

describe("gaMeasurementId", () => {
  it("is off when unset", () => {
    expect(gaMeasurementId({})).toBeNull();
    expect(gaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "" })).toBeNull();
  });

  it("accepts a GA4 measurement id, normalizing case and whitespace", () => {
    expect(gaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: " g-abc123xyz9 " })).toBe(
      "G-ABC123XYZ9",
    );
  });

  it("rejects Universal Analytics, GTM and malformed ids", () => {
    expect(gaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-12345-1" })).toBeNull();
    expect(gaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "GTM-ABCDEF" })).toBeNull();
    expect(gaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-" })).toBeNull();
  });
});
