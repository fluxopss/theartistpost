import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import localFont from "next/font/local";
import { getSession } from "@/features/auth/adapter";
import { assets, site } from "@/content/site";
import { AppShell } from "@/shared/ui/AppShell";
import { Providers } from "@/shared/ui/Providers";
import { SITE_URL } from "@/shared/lib/constants";
import { JsonLd, organizationJsonLd } from "@/lib/seo/json-ld";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const clash = localFont({
  src: [
    {
      path: "../fonts/ClashDisplay-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/ClashDisplay-Bold.woff2",
      weight: "700",
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
  },
  icons: {
    icon: assets.favicon,
    apple: assets.favicon,
  },
  openGraph: {
    title: site.name,
    description: site.metaDescription,
    images: [assets.cover],
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    site: site.twitterHandle,
    images: [assets.cover],
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

const themeInit = `(function(){try{var t=localStorage.getItem('tap-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

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
        <link rel="preload" as="image" href="/brand/cover-opt.jpg" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full antialiased">
        <JsonLd data={organizationJsonLd()} />
        <Providers user={user}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
