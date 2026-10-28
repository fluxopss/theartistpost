import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventDTO } from "@/server/api/dto";

const fixtures = vi.hoisted(() => ({
  upcoming: [] as EventDTO[],
  byId: new Map<string, EventDTO>(),
}));

vi.mock("@/server/api/siteEvents", () => ({
  listSiteEvents: vi.fn(async () => fixtures.upcoming),
  listUpcomingSiteEvents: vi.fn(async () => fixtures.upcoming),
  findSiteEvent: vi.fn(async (id: string) => fixtures.byId.get(id) ?? null),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/stage/GenreRail", () => ({ GenreRail: () => null }));

import ArtistSchedulePage, {
  metadata as scheduleMetadata,
} from "@/app/artist-schedule/page";
import EventPage from "@/app/event/[id]/page";
import SponsorsPage, {
  dynamic as sponsorsDynamic,
  metadata as sponsorsMetadata,
} from "@/app/sponsors/page";
import sitemap from "@/app/sitemap";
import { OpeningDoor } from "@/features/night/OpeningDoor";
import { LEGACY_REDIRECTS } from "@/shared/lib/legacyRedirects";
import nextConfig from "../../../next.config";

function dto(overrides: Partial<EventDTO> = {}): EventDTO {
  return {
    id: "evt_plain",
    title: "Open Studio Night",
    artist: "",
    medium: "community",
    start: "2099-10-30T18:00:00-04:00",
    end: "2099-10-30T22:00:00-04:00",
    venue: "Hacienda",
    description: "Doors at six.",
    comingSoon: false,
    status: "upcoming",
    source: "db",
    cancelled: false,
    timeZone: "America/New_York",
    venueAddress: null,
    latitude: null,
    longitude: null,
    capacity: null,
    coverImageUrl: null,
    presentedBy: null,
    vendors: [],
    ...overrides,
  };
}

const plain = dto();
const culinary = dto({
  id: "evt_culinary",
  title: "Chefs on Clematis",
  medium: "culinary",
  start: "2099-11-06T18:00:00-05:00",
  end: "2099-11-06T22:00:00-05:00",
  presentedBy: {
    name: "Clematis Coffee",
    url: "https://clematis.coffee/",
    logoUrl: "https://theartistpost.org/uploads/clematis-logo.png",
  },
  vendors: [
    { name: "Taco Bus", offering: "Street tacos", url: "https://taco.bus/" },
    { name: "Pie Lady", offering: "", url: null },
  ],
});
const music = dto({
  id: "evt_music",
  title: "Strings Night",
  medium: "music",
  start: "2099-11-13T18:00:00-05:00",
  end: "2099-11-13T22:00:00-05:00",
});

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const schedulePage = (lane?: string) =>
  ({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(lane ? { lane } : {}),
  }) as PageProps<"/artist-schedule">;
const PRESENTED = /presented by/i;

afterEach(() => cleanup());

beforeEach(() => {
  fixtures.upcoming = [plain, culinary, music];
  fixtures.byId = new Map([plain, culinary, music].map((e) => [e.id, e]));
});

describe("a night without a sponsor (acceptance 5)", () => {
  it("/event/[id] renders zero 'Presented by' text and no vendor list", async () => {
    const { container } = render(await EventPage(params("evt_plain")));
    expect(container.textContent).not.toMatch(PRESENTED);
    expect(screen.queryByText("Food & vendors")).not.toBeInTheDocument();
    const ld = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.innerHTML,
    );
    expect(ld.sponsor).toBeUndefined();
  });

  it("the home door renders zero 'Presented by' text", () => {
    const { container } = render(<OpeningDoor event={plain} />);
    expect(container.textContent).not.toMatch(PRESENTED);
  });

  it("the schedule says it only for the presented night", async () => {
    fixtures.upcoming = [plain, music];
    const { container } = render(await ArtistSchedulePage(schedulePage()));
    expect(container.textContent).not.toMatch(PRESENTED);
  });
});

describe("a presented culinary night", () => {
  it("/event/[id] says who presents it, links out as sponsored, and lists vendors", async () => {
    const { container } = render(await EventPage(params("evt_culinary")));
    const line = screen.getByTestId("presented-by");
    expect(line).toHaveTextContent("Presented by Clematis Coffee");
    const link = within(line).getByRole("link");
    expect(link).toHaveAttribute("href", "https://clematis.coffee/");
    expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    expect(line.querySelector("img")).toHaveAttribute(
      "src",
      "https://theartistpost.org/uploads/clematis-logo.png",
    );

    const vendors = screen.getByRole("region", { name: "Food & vendors" });
    const items = within(vendors).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Taco Bus");
    expect(items[0]).toHaveTextContent("Street tacos");
    expect(within(items[0]!).getByRole("link", { name: /taco bus/i })).toHaveAttribute(
      "href",
      "https://taco.bus/",
    );
    expect(within(items[1]!).queryByRole("link")).not.toBeInTheDocument();

    const ld = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.innerHTML,
    );
    expect(ld.sponsor).toEqual({
      "@type": "Organization",
      name: "Clematis Coffee",
      url: "https://clematis.coffee/",
      logo: "https://theartistpost.org/uploads/clematis-logo.png",
    });
  });

  it("a sponsor with no link or logo is still disclosed, as plain text", async () => {
    fixtures.byId.set(
      "evt_culinary",
      { ...culinary, presentedBy: { name: "Clematis Coffee", url: null, logoUrl: null } },
    );
    render(await EventPage(params("evt_culinary")));
    const line = screen.getByTestId("presented-by");
    expect(line).toHaveTextContent("Presented by Clematis Coffee");
    expect(within(line).queryByRole("link")).not.toBeInTheDocument();
    expect(line.querySelector("img")).toBeNull();
  });

  it("the home door says it plainly", () => {
    render(<OpeningDoor event={culinary} />);
    expect(screen.getByTestId("presented-by")).toHaveTextContent(
      "Presented by Clematis Coffee",
    );
  });
});

describe("/artist-schedule lane chips", () => {
  const page = (lane?: string) => ArtistSchedulePage(schedulePage(lane));

  it("offers every house lane, Culinary second, plus all nights", async () => {
    render(await page());
    const nav = screen.getByRole("navigation", { name: /lanes/i });
    const links = within(nav).getAllByRole("link");
    expect(links[0]).toHaveTextContent(/all nights/i);
    expect(links[0]).toHaveAttribute("href", "/artist-schedule");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveAttribute("href", "/artist-schedule?lane=music");
    expect(links[2]).toHaveAttribute("href", "/artist-schedule?lane=culinary");
    expect(links[2]).toHaveTextContent("Culinary Artists");
  });

  it("filters to one lane", async () => {
    render(await page("culinary"));
    expect(screen.getAllByText("Chefs on Clematis").length).toBeGreaterThan(0);
    expect(screen.queryByText("Strings Night")).not.toBeInTheDocument();
    expect(screen.queryByText("Open Studio Night")).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: /lanes/i });
    expect(within(nav).getByRole("link", { name: "Culinary Artists" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("is honest when a lane has no nights yet", async () => {
    render(await page("dance"));
    const empty = screen.getByTestId("lane-empty");
    expect(empty).toHaveTextContent(/dancers/i);
    expect(within(empty).getByRole("link", { name: /all nights/i })).toHaveAttribute(
      "href",
      "/artist-schedule",
    );
    expect(screen.queryByText("Chefs on Clematis")).not.toBeInTheDocument();
  });

  it("ignores an unknown lane and keeps the canonical page", async () => {
    render(await page("crypto"));
    expect(screen.getAllByText("Strings Night").length).toBeGreaterThan(0);
    expect(JSON.stringify(scheduleMetadata)).not.toMatch(/lane/);
  });
});

describe("/sponsors", () => {
  it("renders per request, is in the sitemap, and is no longer redirected", async () => {
    expect(sponsorsDynamic).toBe("force-dynamic");
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(urls).toContain("/sponsors");
    expect(LEGACY_REDIRECTS.map((r) => r.source)).not.toContain("/sponsors");
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects.map((r) => r.source)).not.toContain("/sponsors");
    expect(String(sponsorsMetadata.description)).not.toMatch(/\$|price|fee/i);
  });

  it("lists only real presented nights", async () => {
    render(await SponsorsPage());
    const list = screen.getByRole("region", { name: /nights presented by/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Chefs on Clematis");
    expect(items[0]).toHaveTextContent("Clematis Coffee");
    expect(within(items[0]!).getByRole("link", { name: /chefs on clematis/i })).toHaveAttribute(
      "href",
      "/event/evt_culinary",
    );
  });

  it("shows an honest empty state with zero presented nights (acceptance 6)", async () => {
    fixtures.upcoming = [plain, music];
    const { container } = render(await SponsorsPage());
    const list = screen.getByRole("region", { name: /nights presented by/i });
    expect(within(list).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(list).getByTestId("sponsors-empty")).toBeInTheDocument();
    // No invented sponsor names: the only "Presented by" text is the explainer.
    expect(container.textContent).not.toMatch(/Clematis Coffee/);
  });

  it("explains sponsorship without prices, and points to the partner door", async () => {
    const { container } = render(await SponsorsPage());
    const text = container.textContent ?? "";
    expect(text).toMatch(/coordination/i);
    expect(text).toMatch(/free/i);
    expect(text).toMatch(/never pay/i);
    expect(text).not.toMatch(/\$\s?\d|\bprice|\bper night|\btier|\bguarantee|\breach\b/i);
    const cta = screen.getAllByRole("link", { name: /partner/i })[0];
    expect(cta).toHaveAttribute("href", "/get-involved?door=partner");
  });
});
