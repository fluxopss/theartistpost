import type { NextConfig } from "next";

/**
 * Baseline security headers for every route. HSTS has no includeSubDomains and
 * no preload, so it only pins the exact host serving the page and never touches
 * The Artist Post's Microsoft 365 / other subdomains.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/brand/love-all.png",
        destination: "/brand/love-all.webp",
        permanent: true,
      },
      {
        source: "/brand/coming-soon.jpg",
        destination: "/brand/coming-soon.webp",
        permanent: true,
      },
      {
        source: "/brand/about-hero.png",
        destination: "/brand/about-hero.webp",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
