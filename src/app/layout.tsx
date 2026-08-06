import type { Metadata, Viewport } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import { getSession } from "@/features/auth/adapter";
import { assets, site } from "@/content/site";
import { AppShell } from "@/shared/ui/AppShell";
import { Providers } from "@/shared/ui/Providers";
import { SITE_URL } from "@/shared/lib/constants";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
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
  icons: {
    icon: assets.favicon,
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
  themeColor: "#031A37",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession();

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${openSans.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <Providers user={user}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
