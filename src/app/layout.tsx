import type { Metadata } from "next";
import { AppChrome } from "@/components/layout/AppChrome";
import "./globals.css";

/**
 * Fonts: Space Grotesk / Inter / JetBrains Mono via CSS (see globals.css).
 * Avoids next/font Google fetch failures in offline / restricted CI.
 */

export const metadata: Metadata = {
  title: {
    default: "Guestay | Shared Spaces, Better Living",
    template: "%s · Guestay",
  },
  description:
    "Book shared bedrooms and flats in Lahore Cantt. Clear duration-based rates, direct-booking deposit credit, and real people when you need them.",
  metadataBase: new URL("https://guestay.pk"),
  openGraph: {
    title: "Guestay | Shared Spaces, Better Living",
    description:
      "Coliving rooms and flats on Bedian Road — book online with clear pricing.",
    type: "website",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
