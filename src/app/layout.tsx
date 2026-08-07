import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { getSession } from "@/features/auth/adapter";
import { assets, site } from "@/content/site";
import { AppShell } from "@/shared/ui/AppShell";
import { Providers } from "@/shared/ui/Providers";
import { SITE_URL } from "@/shared/lib/constants";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  },
  twitter: {
    card: "summary_large_image",
    site: site.twitterHandle,
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
      className={`${jost.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap"
          rel="stylesheet"
        />
        <style>{`:root{--font-clash:"Clash Display",sans-serif;}`}</style>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers user={user}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
