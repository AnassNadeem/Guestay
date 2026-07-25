"use client";

import { ScrollSplitCard } from "@/components/ui/scroll-split-card";
import { Shirt, Sofa, Utensils, Wifi } from "lucide-react";

const HOUSE_IMAGE = "/images/house-front.jpg";

const facilityCards = [
  {
    title: "Connect & cook",
    description:
      "High-speed Wi-Fi built for calls. A full kitchen with shared staples and shelf space that is yours.",
    bgColor: "#E7E7D6",
    textColor: "#3B4430",
    icon: (
      <div className="flex gap-3">
        <Wifi className="h-6 w-6" strokeWidth={1.75} />
        <Utensils className="h-6 w-6" strokeWidth={1.75} />
      </div>
    ),
  },
  {
    title: "Gather & breathe",
    description:
      "A lounge that feels like home, not a lobby. Rooftop chairs when you need air away from the street.",
    bgColor: "#A6AC7E",
    textColor: "#3B4430",
    icon: <Sofa className="h-6 w-6" strokeWidth={1.75} />,
  },
  {
    title: "Daily ease",
    description:
      "In-house laundry with no coins. Weekly cleaning of common areas, so the house stays easy to live in.",
    bgColor: "#3B4430",
    textColor: "#E7E7D6",
    icon: <Shirt className="h-6 w-6" strokeWidth={1.75} />,
  },
];

export function Amenities() {
  return (
    <section className="bg-paper" aria-labelledby="house-heading">
      <ScrollSplitCard
        imageSrc={HOUSE_IMAGE}
        cards={facilityCards}
        startHint="Scroll to open the house"
        header={
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
              The house
            </p>
            <h2
              id="house-heading"
              className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
            >
              What you share, and what you don&apos;t
            </h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg">
              Private rooms stay private. Scroll the house image to see what the
              whole house shares.
            </p>
          </div>
        }
      />
    </section>
  );
}
