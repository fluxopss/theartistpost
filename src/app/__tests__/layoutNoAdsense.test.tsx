import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({ Jost: () => ({ variable: "font-jost" }) }));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-clash" }) }));
vi.mock("@/features/auth/adapter", () => ({ getSession: async () => null }));
vi.mock("@/shared/ui/Providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/shared/ui/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/seo/PulseBeacon", () => ({ PulseBeacon: () => null }));
vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <meta name="x-test-ga" content={gaId} />
  ),
}));

import RootLayout from "@/app/layout";

describe("root layout and Ad Grants policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renders no AdSense meta tag or ad script, even with a publisher ID set", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "pub-4113707647961773");
    const html = renderToStaticMarkup(
      await RootLayout({ children: <main>Home</main> }),
    );
    expect(html).not.toContain("google-adsense-account");
    expect(html).not.toContain("adsbygoogle");
    expect(html).not.toContain("googlesyndication");
  });

  it("still loads GA4 when a measurement id is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST12345");
    const html = renderToStaticMarkup(
      await RootLayout({ children: <main>Home</main> }),
    );
    expect(html).toContain(`<meta name="x-test-ga" content="G-TEST12345"/>`);
  });
});
