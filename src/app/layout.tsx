import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
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
    default: "Guestay — Shared Spaces, Better Living",
    template: "%s · Guestay",
  },
  description:
    "Coliving rooms with real kitchens, clear rates, and neighbors who know when to say hello. Book direct for 10% off your security deposit.",
  openGraph: {
    title: "Guestay — Shared Spaces, Better Living",
    description:
      "A small coliving house for private rooms, shared living, and stays that feel like home.",
    type: "website",
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
        className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-white font-sans text-ink antialiased`}
      >
        <Nav />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
