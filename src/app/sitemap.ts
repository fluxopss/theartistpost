import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/lib/constants";
import { content } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await content.getEvents();
  const base = SITE_URL.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/get-involved",
    "/artist-schedule",
    "/kindness-always",
    "/supporters",
    "/explore",
    "/create",
    "/more",
    "/install",
    "/settings",
    "/saved",
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
    url: `${base}/event/${e.id}`,
    lastModified: new Date(e.start),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...eventRoutes];
}
