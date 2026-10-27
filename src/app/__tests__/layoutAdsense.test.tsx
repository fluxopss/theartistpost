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

import RootLayout from "@/app/layout";

const PUB = "pub-4113707647961773";

async function renderLayout(page: React.ReactNode = <main>Donate</main>) {
  const tree = await RootLayout({ children: page });
  return renderToStaticMarkup(tree);
}

describe("root layout and AdSense", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never loads Google's ad script site-wide, even with approved spots", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", "history-end:1234567890,home-lower:5555555555");
    // Legacy switch from PR #44: must have no effect any more.
    vi.stubEnv("ADSENSE_AUTO_ADS", "1");
    const html = await renderLayout();
    expect(html).not.toContain("adsbygoogle");
    expect(html).not.toContain("googlesyndication");
  });

  it("keeps the google-adsense-account meta tag for site verification", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    const html = await renderLayout();
    expect(html).toContain(`<meta name="google-adsense-account" content="ca-${PUB}"/>`);
  });

  it("has no AdSense markup at all while the publisher ID is unset", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "");
    const html = await renderLayout();
    expect(html).not.toContain("google-adsense-account");
    expect(html).not.toContain("adsbygoogle");
  });
});
