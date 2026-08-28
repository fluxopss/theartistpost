import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
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
