import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/lib/constants";
import { listUpcomingSiteEvents } from "@/server/api/siteEvents";

/** Upcoming nights come from the database, so build the sitemap per request. */
export const dynamic = "force-dynamic";

/**
 * Public pages only. Personal or utility pages (/settings, /saved, /create,
 * /install, /delete-account) stay out, and only upcoming nights are listed;
 * past nights keep their pages but leave the sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await listUpcomingSiteEvents();
  const base = SITE_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/history",
    "/get-involved",
    "/night",
    "/artist-schedule",
    "/kindness-always",
    "/supporters",
    "/donate",
    "/explore",
    "/more",
    "/privacy",
    "/terms",
    "/support",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));

  const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${base}/event/${encodeURIComponent(e.id)}`,
    lastModified: new Date(e.start),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...eventRoutes];
}
