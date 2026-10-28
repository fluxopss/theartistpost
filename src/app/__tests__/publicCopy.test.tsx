import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { appCopy } from "@/content/site";
import { chapters } from "@/lib/content/chapters.seed";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import { metadata as privacyMetadata } from "@/app/privacy/page";

afterEach(() => cleanup());

const DEV_TALK = /Capacitor|binary|Flux VPS|\bTBD\b|placeholder/i;

describe("public copy is plain and accurate", () => {
  it("/supporters chapters say the local team is forming", () => {
    const forming = chapters.filter((c) => /team/i.test(c.summary));
    expect(chapters.map((c) => c.summary).join(" ")).not.toMatch(/TBD/);
    expect(forming.length).toBeGreaterThanOrEqual(3);
    expect(forming.every((c) => c.summary.includes("Local team forming"))).toBe(true);
  });

  it("install copy has no build-tool talk", () => {
    expect(JSON.stringify(appCopy.installBenefits)).not.toMatch(DEV_TALK);
    expect(appCopy.installLead).not.toMatch(DEV_TALK);
  });

  it("/terms does not call listings placeholders", () => {
    const { container } = render(<TermsPage />);
    expect(container.textContent).not.toMatch(/placeholders?/i);
  });
});

describe("/privacy describes what the house actually collects", () => {
  it("is dated October 27, 2026 and talks about the app in the present", () => {
    const { container } = render(<PrivacyPage />);
    expect(screen.getByText("Last updated October 27, 2026")).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/future App Store/i);
    expect(String(privacyMetadata.description)).not.toMatch(/future/i);
  });

  it("no longer claims there is no account system", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/do not run a public account/i);
    expect(text).not.toMatch(/not uploaded until artist accounts exist/i);
  });

  it("names each thing the code stores, and why", () => {
    const { container } = render(<PrivacyPage />);
    const text = (container.textContent ?? "").toLowerCase();
    for (const fact of [
      "sign-in code",
      "profile",
      "community board",
      "photos",
      "rsvp",
      "check in",
      "location",
      "block",
      "report",
      "delete your account",
    ]) {
      expect(text, fact).toContain(fact);
    }
    // Check-in never keeps coordinates (prisma EventCheckIn stores only a boolean).
    expect(text).toMatch(/never stored|not stored|do not store|don't store/);
  });

  it("describes what the Pulse analytics beacon actually sends", () => {
    const { container } = render(<PrivacyPage />);
    const heading = screen.getByRole("heading", { name: "Analytics" });
    const section = heading.nextElementSibling?.textContent ?? "";
    for (const fact of [
      /page view/i,
      /every 15 seconds/i,
      /visible/i,
      /page address/i,
      /referr/i,
      /screen width/i,
      /scroll/i,
      /campaign/i,
      /random visitor id/i,
      /local storage/i,
      /pulse\.fluxlab\.agency/,
      /Flux Labs/,
      /not sold|never sold|do not sell/i,
      /ads profile|advertising profile/i,
    ]) {
      expect(section, String(fact)).toMatch(fact);
    }
    expect(section).not.toMatch(/anonymous product events/i);
    expect(container.textContent).toMatch(/clear them in Settings/i);
  });
});

