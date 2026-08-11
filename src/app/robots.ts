import type { MetadataRoute } from "next";
import { SITE_URL } from "@/shared/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/(dev)/", "/styleguide"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
