import type { Metadata } from "next";
import { AppChrome } from "@/components/layout/AppChrome";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteContact } from "@/lib/mock";
import { buildLodgingBusinessJsonLd } from "@/lib/seo/schema";
import {
  absoluteUrl,
  HOME_DESCRIPTION,
  HOME_TITLE,
} from "@/lib/seo/site";
import "./globals.css";

/**
 * Fonts: Space Grotesk / Inter / JetBrains Mono via CSS (see globals.css).
 * Avoids next/font Google fetch failures in offline / restricted CI.
 */

export const metadata: Metadata = {
  title: {
    default: HOME_TITLE,
    template: "%s · Guestay",
  },
  description: HOME_DESCRIPTION,
  metadataBase: new URL(absoluteUrl()),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: absoluteUrl(),
    siteName: "Guestay",
    locale: "en_PK",
    images: [
      {
        url: "/brand/lockup-light.png",
        alt: "Guestay coliving on Bedian Road, Sadaat Town Lahore Cantt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/brand/lockup-light.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contact = await getSiteContact();
  const lodgingLd = buildLodgingBusinessJsonLd(contact);

  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout; next/font blocked offline */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        {/* JSON-LD in body is valid and reliably server-rendered in App Router */}
        <JsonLd data={lodgingLd} />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
