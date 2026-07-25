import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { PromoPopout } from "@/components/home/PromoPopout";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Guestay | Shared Spaces, Better Living",
    template: "%s · Guestay",
  },
  description:
    "Coliving rooms with real kitchens, clear rates, and neighbors who know when to say hello. Call us to book.",
  metadataBase: new URL("https://guestay.example"),
  openGraph: {
    title: "Guestay | Shared Spaces, Better Living",
    description:
      "A small coliving house for private rooms, shared living, and stays that feel like home.",
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
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-cream font-sans text-ink antialiased`}
      >
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <PromoPopout />
      </body>
    </html>
  );
}
