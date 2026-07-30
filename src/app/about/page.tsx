import { AboutContent } from "@/components/about/AboutContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Guestay is a small coliving house built for clear rates, private rooms, and shared living that feels adult.",
};

export default function AboutPage() {
  return <AboutContent />;
}
