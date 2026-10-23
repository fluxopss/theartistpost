import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdSlot } from "@/components/ads/AdSlot";

const PUB = "pub-4113707647961773";

function setUrl(search: string) {
  window.history.replaceState({}, "", `/history${search}`);
}

describe("AdSlot", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
    setUrl("");
    delete window.adsbygoogle;
  });

  it("renders nothing for visitors while the spot is not approved", () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    vi.stubEnv("ADSENSE_SLOTS", "");
    const { container } = render(<AdSlot placement="history-end" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("outlines the proposed spot in preview mode, without an ad", async () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", PUB);
    setUrl("?ad-preview=1");
    render(<AdSlot placement="history-end" />);
    expect(
      await screen.findByLabelText("Proposed ad spot: History, end of the story"),
    ).toBeInTheDocument();
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
    // Preview sticks for the tab session so Robbie can click around.
    setUrl("");
    expect(window.sessionStorage.getItem("tap-ad-preview")).toBe("1");
  });

  it("renders a labeled AdSense unit once approved", () => {
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
  });

  it("never renders a unit without the publisher ID", () => {
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "");
    vi.stubEnv("ADSENSE_SLOTS", "history-end:1234567890");
    render(<AdSlot placement="history-end" />);
    expect(document.querySelector("ins.adsbygoogle")).toBeNull();
  });
});
