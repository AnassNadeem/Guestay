"use client";

import {
  CircularGallery,
  type GalleryItem,
} from "@/components/ui/circular-gallery";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Multiple rooms across the three Guestay categories.
 * Placeholder Unsplash photos until property photography is ready.
 */
const galleryData: GalleryItem[] = [
  {
    common: "Twin bunk",
    binomial: "Shared Rooms",
    href: "/rooms/shared-rooms",
    photo: {
      url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80",
      text: "Shared bunk room with soft lighting",
      pos: "50% 40%",
      by: "From Rs. 25,000 / month",
    },
  },
  {
    common: "Courtyard twin",
    binomial: "Shared Rooms",
    href: "/rooms/shared-rooms",
    photo: {
      url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=900&q=80",
      text: "Twin beds in a shared room",
      pos: "50% 45%",
      by: "From Rs. 25,000 / month",
    },
  },
  {
    common: "Quiet single",
    binomial: "Full Personal Room",
    href: "/rooms/full-personal-room",
    photo: {
      url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80",
      text: "Private bedroom with morning light",
      pos: "50% 35%",
      by: "From Rs. 45,000 / month",
    },
  },
  {
    common: "Garden desk room",
    binomial: "Full Personal Room",
    href: "/rooms/full-personal-room",
    photo: {
      url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      text: "Personal room with work desk",
      pos: "48% 40%",
      by: "From Rs. 45,000 / month",
    },
  },
  {
    common: "Corner personal",
    binomial: "Full Personal Room",
    href: "/rooms/full-personal-room",
    photo: {
      url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
      text: "Furnished personal room",
      pos: "50% 30%",
      by: "From Rs. 45,000 / month",
    },
  },
  {
    common: "2-bed living",
    binomial: "Full 2-Bedroom Flat",
    href: "/rooms/full-2-bedroom-flats",
    photo: {
      url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
      text: "Living area in a two-bedroom flat",
      pos: "50% 40%",
      by: "From Rs. 95,000 / month",
    },
  },
  {
    common: "2-bed kitchen",
    binomial: "Full 2-Bedroom Flat",
    href: "/rooms/full-2-bedroom-flats",
    photo: {
      url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
      text: "Kitchen in a two-bedroom flat",
      pos: "50% 45%",
      by: "From Rs. 95,000 / month",
    },
  },
  {
    common: "2-bed suite",
    binomial: "Full 2-Bedroom Flat",
    href: "/rooms/full-2-bedroom-flats",
    photo: {
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
      text: "Bedroom in a two-bedroom flat",
      pos: "50% 35%",
      by: "From Rs. 95,000 / month",
    },
  },
  {
    common: "Lounge bunk",
    binomial: "Shared Rooms",
    href: "/rooms/shared-rooms",
    photo: {
      url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
      text: "Shared living near bunk rooms",
      pos: "50% 50%",
      by: "From Rs. 25,000 / month",
    },
  },
];

export function RoomsCircularGallery() {
  const [radius, setRadius] = useState(400);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setRadius(260);
      else if (w < 1024) setRadius(360);
      else setRadius(480);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section
      data-circular-gallery-scroll
      className="relative bg-paper"
      style={{ height: "280vh" }}
      aria-labelledby="rooms-gallery-heading"
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="container-page relative z-10 flex shrink-0 flex-col items-center pb-4 pt-24 text-center md:pb-6 md:pt-28">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            Rooms
          </p>
          <h2
            id="rooms-gallery-heading"
            className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            Three ways to stay
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted md:text-base">
            Shared rooms, personal rooms, and 2-bedroom flats. Scroll to turn
            the gallery, then open a room for details.
          </p>
          <Link
            href="/rooms"
            className="mt-4 text-sm font-medium text-olive underline-offset-4 hover:underline"
          >
            View all rooms
          </Link>
        </div>

        <div className="relative min-h-0 w-full flex-1 pb-10 sm:pb-12">
          <CircularGallery
            items={galleryData}
            radius={radius}
            autoRotateSpeed={0.015}
          />
        </div>
      </div>
    </section>
  );
}
