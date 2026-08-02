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
  const safe = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const total = safe.length;

  function prev() {
    if (total === 0) return;
    setActive((i) => (i - 1 + total) % total);
  }
  function next() {
    if (total === 0) return;
    setActive((i) => (i + 1) % total);
  }

  const current = safe[active] || safe[0];

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-cream-200 shadow-soft">
        {current ? (
          <Image
            src={current}
            alt={`${name}, photo ${active + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-cream-200 to-olive/20"
            aria-label={`${name} (no photos yet)`}
          />
        )}
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
      {total > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {safe.slice(0, 4).map((src, i) => (
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
      )}
    </div>
  );
}
