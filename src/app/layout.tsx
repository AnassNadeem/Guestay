import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
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

const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

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
    <html
      lang="en"
      className={`${fontBody.variable} ${fontDisplay.variable} ${fontMono.variable}`}
    >
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        {/* JSON-LD in body is valid and reliably server-rendered in App Router */}
        <JsonLd data={lodgingLd} />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
