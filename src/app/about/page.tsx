import { AboutContent } from "@/components/about/AboutContent";
import { getTeam } from "@/lib/mock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Guestay is a small coliving house built for clear rates, private rooms, and shared living that feels adult.",
};

export default async function AboutPage() {
  const team = await getTeam();
  return <AboutContent team={team} />;
}
