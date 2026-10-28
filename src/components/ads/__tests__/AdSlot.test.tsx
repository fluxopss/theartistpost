import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AD_FREE_PATHS } from "@/lib/ads/placements";
import { AdSlot } from "@/components/ads/AdSlot";

const PUB = "pub-4113707647961773";
const APPROVED = "history-end:1234567890,home-lower:5555555555";

let pathname: string | null = "/history";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

// Stand-in for next/script that renders inline, so "the ad script was asked
// for" is visible in the rendered tree (real next/script dedupe is covered in
// AdUnit.script.test.tsx).
vi.mock("next/script", () => ({
  default: (props: { id?: string; src?: string }) =>
    React.createElement("script", { "data-next-script": "", id: props.id, src: props.src }),
}));

function setUrl(search: string) {
  window.history.replaceState({}, "", `/history${search}`);
}

function adScripts() {
  return document.querySelectorAll('script[src*="adsbygoogle.js"]');
}

describe("AdSlot", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
    setUrl("");
    pathname = "/history";
    delete window.adsbygoogle;
  });

  it("renders nothing for visitors while the spot is not approved", () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", "");
    const { container } = render(<AdSlot placement="history-end" />);
    expect(container).toBeEmptyDOMElement();
    expect(adScripts()).toHaveLength(0);
  });

  it("outlines the proposed spot in preview mode, without an ad or the ad script", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    setUrl("?ad-preview=1");
    render(<AdSlot placement="history-end" />);
    expect(
      await screen.findByLabelText("Proposed ad spot: History, end of the story"),
    ).toBeInTheDocument();
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
    expect(adScripts()).toHaveLength(0);
    // Preview sticks for the tab session so Robbie can click around.
    setUrl("");
    expect(window.sessionStorage.getItem("tap-ad-preview")).toBe("1");
  });

  it("renders a labeled AdSense unit, and the ad script, once approved", () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", "history-end:1234567890");
    render(<AdSlot placement="history-end" />);
    const unit = document.querySelector("ins.adsbygoogle");
    expect(unit).toHaveAttribute("data-ad-client", `ca-${PUB}`);
    expect(unit).toHaveAttribute("data-ad-slot", "1234567890");
    expect(screen.getByLabelText("Advertisement")).toHaveTextContent(
      "helps keep artist opportunities free",
    );
    expect(window.adsbygoogle).toHaveLength(1);
    const scripts = adScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute(
      "src",
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${PUB}`,
    );
    expect(scripts[0]).toHaveAttribute("id", "adsbygoogle-js");
  });

  it("asks for the script only with the approved unit, not with unapproved spots", () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", "history-end:1234567890");
    render(
      <>
        <AdSlot placement="about-end" />
        <AdSlot placement="schedule-end" />
      </>,
    );
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
    expect(adScripts()).toHaveLength(0);
  });

  it("never renders a unit or the script without the publisher ID", () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "");
    vi.stubEnv("ADSENSE_SLOTS", "history-end:1234567890");
    render(<AdSlot placement="history-end" />);
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
    expect(adScripts()).toHaveLength(0);
  });
});

describe("AdSlot on an ad-free page", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
    setUrl("");
    pathname = "/history";
    delete window.adsbygoogle;
  });

  const adFreeRoutes = [
    ...AD_FREE_PATHS,
    "/community/abc",
    "/post/123",
    "/u/robbie",
    "/event/42",
  ];

  it.each(adFreeRoutes)("renders nothing on %s, even when the spot is approved", (route) => {
    pathname = route;
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", APPROVED);
    const { container } = render(
      <>
        <AdSlot placement="history-end" />
        <AdSlot placement="home-lower" />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
    expect(adScripts()).toHaveLength(0);
    expect(window.adsbygoogle).toBeUndefined();
  });

  it("shows no preview outline there either", async () => {
    pathname = "/donate";
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    setUrl("?ad-preview=1");
    const { container } = render(<AdSlot placement="history-end" />);
    // Give the preview marker's mount effect a chance to run.
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it("fails closed when the route is unknown", () => {
    pathname = null;
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", APPROVED);
    const { container } = render(<AdSlot placement="history-end" />);
    expect(container).toBeEmptyDOMElement();
  });
});
