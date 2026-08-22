import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
