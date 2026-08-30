import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import localFont from "next/font/local";
import { getSession } from "@/features/auth/adapter";
import { assets, site } from "@/content/site";
import { AppShell } from "@/shared/ui/AppShell";
import { Providers } from "@/shared/ui/Providers";
import { SITE_URL } from "@/shared/lib/constants";
import { JsonLd, organizationJsonLd } from "@/lib/seo/json-ld";
import { PulseBeacon } from "@/components/seo/PulseBeacon";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const clash = localFont({
  src: [
    {
      path: "../fonts/ClashDisplay-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-clash",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.metaDescription,
  applicationName: site.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: site.name,
    startupImage: [assets.coverOg],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: assets.favicon, sizes: "64x64", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: assets.icon192, sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: site.name,
    description: site.metaDescription,
    images: [assets.coverOg],
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    site: site.twitterHandle,
    images: [assets.coverOg],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#031A37" },
    { media: "(prefers-color-scheme: light)", color: "#F3F5F9" },
  ],
};

const themeInit = `(function(){try{var t=localStorage.getItem('tap-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');if(localStorage.getItem('tap-motion')==='\"reduce\"')document.documentElement.classList.add('reduce-motion');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();

  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${jost.variable} ${clash.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preload"
          as="image"
          href="/brand/cover-opt.webp"
          fetchPriority="high"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full antialiased">
        <JsonLd data={organizationJsonLd()} />
        <Providers user={user}>
          <AppShell>{children}</AppShell>
        </Providers>
        <PulseBeacon />
      </body>
    </html>
  );
}
