import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ADSENSE_SCRIPT_ID, AdUnit } from "@/components/ads/AdUnit";

const CLIENT = "ca-pub-4113707647961773";

// Real next/script (not mocked): it injects Google's script into the document
// after mount, and only once per page however many approved units render.
describe("AdUnit ad script", () => {
  afterEach(() => {
    cleanup();
    delete window.adsbygoogle;
  });

  it("loads adsbygoogle.js once, even with several approved units", async () => {
    expect(document.querySelectorAll('script[src*="adsbygoogle.js"]')).toHaveLength(0);
    render(
      <>
        <AdUnit client={CLIENT} slot="1234567890" placement="history-end" />
        <AdUnit client={CLIENT} slot="2345678901" placement="about-end" />
      </>,
    );
    await new Promise((r) => setTimeout(r, 0));
    const scripts = document.querySelectorAll('script[src*="adsbygoogle.js"]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute("id", ADSENSE_SCRIPT_ID);
    expect(scripts[0]?.getAttribute("src")).toBe(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`,
    );
    expect(scripts[0]).toHaveAttribute("crossorigin", "anonymous");
    // Each unit queued itself for the script to fill.
    expect(window.adsbygoogle).toHaveLength(2);
  });
});
