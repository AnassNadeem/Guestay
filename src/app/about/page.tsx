import { AboutContent } from "@/components/about/AboutContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Guestay",
  description:
    "Guestay is a coliving house on Bedian Road in Sadaat Town, Lahore Cantt — clear rates, shared bedrooms and flats, and shared living that feels adult.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutContent />;
}
