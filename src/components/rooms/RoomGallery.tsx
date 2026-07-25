"use client";

import Image from "next/image";
import { useState } from "react";

export function RoomGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-cream-200 shadow-soft">
        <Image
          src={images[active] ?? images[0]}
          alt={`${name}, photo ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
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
