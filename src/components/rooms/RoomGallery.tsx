"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export function RoomGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const total = images.length;

  function prev() {
    setActive((i) => (i - 1 + total) % total);
  }
  function next() {
    setActive((i) => (i + 1) % total);
  }

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-cream-200 shadow-soft">
        <Image
          src={images[active] ?? images[0]!}
          alt={`${name}, photo ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/90 text-olive shadow-soft transition-transform hover:scale-[1.05]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/90 text-olive shadow-soft transition-transform hover:scale-[1.05]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        {images.slice(0, 4).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setActive(i)}
            className={`relative aspect-[4/3] overflow-hidden rounded-soft transition-all ${
              active === i
                ? "ring-2 ring-olive ring-offset-2"
                : "opacity-80 hover:opacity-100"
            }`}
            aria-label={`Show photo ${i + 1}`}
          >
            <Image src={src} alt="" fill sizes="120px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
