import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventDTO } from "@/server/api/dto";

const fixtures = vi.hoisted(() => ({
  all: [] as EventDTO[],
  upcoming: [] as EventDTO[],
  byId: new Map<string, EventDTO>(),
  props: {} as Record<string, unknown>,
}));

vi.mock("@/server/api/siteEvents", () => ({
  listSiteEvents: vi.fn(async () => fixtures.all),
  listUpcomingSiteEvents: vi.fn(async () => fixtures.upcoming),
  findSiteEvent: vi.fn(async (id: string) => fixtures.byId.get(id) ?? null),
}));
vi.mock("@/lib/content", async (orig) => ({
  ...(await orig<typeof import("@/lib/content")>()),
  content: {
    getArtists: async () => [],
    getEvents: async () => {
      throw new Error("pages must not read the seed schedule directly");
    },
    getEventById: async () => {
      throw new Error("pages must not read the seed schedule directly");
    },
    getWallNotes: async () => [],
    getChapters: async () => [],
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/stage/GenreRail", () => ({ GenreRail: () => null }));
vi.mock("@/features/wall/LivingWall", () => ({
  LivingWall: (props: Record<string, unknown>) => {
    fixtures.props.wall = props;
    return null;
  },
}));
vi.mock("@/features/involve/InvolveExperience", () => ({
  InvolveExperience: (props: Record<string, unknown>) => {
    fixtures.props.involve = props;
    return null;
  },
}));
vi.mock("@/features/night/NightRoom", () => ({
  NightRoom: (props: { event: EventDTO }) => {
    fixtures.props.nightRoom = props;
    return <p>night room {props.event.title}</p>;
  },
}));
vi.mock("@/features/night/OpeningDoor", () => ({
  OpeningDoor: (props: { event: EventDTO }) => <p>door {props.event.title}</p>,
}));
vi.mock("@/features/house/HouseHero", () => ({ HouseHero: () => null }));
vi.mock("@/features/home/FeaturedArtistsSection", () => ({ FeaturedArtistsSection: () => null }));
vi.mock("@/features/home/HistoryTeaser", () => ({ HistoryTeaser: () => null }));
vi.mock("@/features/home/HomeKindnessDeferred", () => ({ HomeKindnessDeferred: () => null }));
vi.mock("@/features/home/HomeLowerDeferred", () => ({ HomeLowerDeferred: () => null }));
vi.mock("@/features/involve/MantraStrip", () => ({ MantraStrip: () => null }));
vi.mock("@/features/involve/InvolveHero", () => ({ InvolveHero: () => null }));

import HomePage from "@/app/page";
import NightPage from "@/app/night/page";
import ArtistSchedulePage, {
  dynamic as scheduleDynamic,
} from "@/app/artist-schedule/page";
import EventPage, { dynamic as eventDynamic } from "@/app/event/[id]/page";
import ExplorePage from "@/app/explore/page";
import GetInvolvedPage from "@/app/get-involved/page";
import sitemap, { dynamic as sitemapDynamic } from "@/app/sitemap";

function dto(overrides: Partial<EventDTO> = {}): EventDTO {
  return {
    id: "evt_launch",
    title: "Launch Night",
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
    ...overrides,
  };
}

const launch = dto();
const past = dto({
  id: "e4",
  title: "Kindness Always Community Night",
  start: "2026-09-26T16:00:00-04:00",
  end: "2026-09-26T21:00:00-04:00",
  status: "closed",
  source: "content",
});
const cancelled = dto({
  id: "evt_cancelled",
  title: "Rained Out Night",
  cancelled: true,
  status: "closed",
});

afterEach(() => cleanup());

beforeEach(() => {
  fixtures.all = [past, launch, cancelled];
  fixtures.upcoming = [launch];
  fixtures.byId = new Map([launch, past, cancelled].map((e) => [e.id, e]));
  fixtures.props = {};
});

describe("pages read the same events as /api/v1/events, per request", () => {
  it("every events page renders per request", () => {
    expect(scheduleDynamic).toBe("force-dynamic");
    expect(eventDynamic).toBe("force-dynamic");
    expect(sitemapDynamic).toBe("force-dynamic");
  });

  it("home features the next night published in Manage events", async () => {
    render(await HomePage());
    expect(screen.getByText("door Launch Night")).toBeInTheDocument();
  });

  it("home shows no door when nothing is upcoming", async () => {
    fixtures.upcoming = [];
    render(await HomePage());
    expect(screen.queryByText(/^door /)).not.toBeInTheDocument();
  });

  it("/night holds the next upcoming night", async () => {
    render(await NightPage());
    expect(screen.getByText("night room Launch Night")).toBeInTheDocument();
  });

  it("/explore and /get-involved get upcoming nights only", async () => {
    render(await ExplorePage());
    expect(fixtures.props.wall).toMatchObject({ events: [launch] });
    render(await GetInvolvedPage({ searchParams: Promise.resolve({ door: "events" }) }));
    expect(fixtures.props.involve).toMatchObject({ events: [launch] });
  });
});

describe("/artist-schedule", () => {
  it("lists the upcoming nights and not past or cancelled ones", async () => {
    render(await ArtistSchedulePage());
    expect(screen.getAllByText("Launch Night").length).toBeGreaterThan(0);
    expect(screen.queryByText("Kindness Always Community Night")).not.toBeInTheDocument();
    expect(screen.queryByText("Rained Out Night")).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("shows a warm, honest empty state when nothing is booked", async () => {
    fixtures.upcoming = [];
    render(await ArtistSchedulePage());
    const empty = screen.getByTestId("schedule-empty");
    expect(within(empty).getByText("The next nights are being booked.")).toBeInTheDocument();
    expect(within(empty).getByRole("link", { name: /get involved/i })).toHaveAttribute(
      "href",
      "/get-involved",
    );
    expect(within(empty).getByRole("link", { name: /community/i })).toHaveAttribute(
      "href",
      "/community",
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});

describe("/event/[id]", () => {
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  function jsonLd(container: HTMLElement) {
    const script = container.querySelector('script[type="application/ld+json"]');
    return JSON.parse(script?.innerHTML ?? "{}");
  }

  it("renders a managed night with EventScheduled", async () => {
    const { container } = render(await EventPage(params("evt_launch")));
    expect(screen.getByRole("heading", { level: 1, name: "Launch Night" })).toBeInTheDocument();
    expect(jsonLd(container).eventStatus).toBe("https://schema.org/EventScheduled");
  });

  it("keeps a past night reachable", async () => {
    render(await EventPage(params("e4")));
    expect(
      screen.getByRole("heading", { level: 1, name: "Kindness Always Community Night" }),
    ).toBeInTheDocument();
  });

  it("marks a cancelled night clearly, with EventCancelled", async () => {
    const { container } = render(await EventPage(params("evt_cancelled")));
    expect(screen.getByText(/this night has been cancelled/i)).toBeInTheDocument();
    expect(jsonLd(container).eventStatus).toBe("https://schema.org/EventCancelled");
    expect(screen.queryByRole("link", { name: /add to google calendar/i })).not.toBeInTheDocument();
  });

  it("404s an unknown night", async () => {
    await expect(EventPage(params("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("sitemap", () => {
  it("lists public pages and upcoming nights only", async () => {
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    for (const hidden of ["/settings", "/saved", "/create", "/install", "/delete-account"]) {
      expect(urls).not.toContain(hidden);
    }
    expect(urls).toContain("/artist-schedule");
    expect(urls).toContain("/event/evt_launch");
    expect(urls).not.toContain("/event/e4");
    expect(urls).not.toContain("/event/evt_cancelled");
  });
});
