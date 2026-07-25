"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const FRONT = {
  label: "Rooms",
  line1: "Shared",
  line2: "Spaces",
  image:
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80",
  alt: "Sunlit private room with a made bed",
};

const BACK = {
  label: "Stay",
  line1: "Better",
  line2: "Living",
  image:
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
  alt: "Bright living space with soft seating",
};

const flipEase: [number, number, number, number] = [0.93, 0.03, 0.23, 0.99];

function CardFace({
  label,
  line1,
  line2,
  image,
  alt,
  mirrored = false,
}: {
  label: string;
  line1: string;
  line2: string;
  image: string;
  alt: string;
  mirrored?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[1rem]"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: mirrored ? "rotateX(180deg)" : undefined,
      }}
    >
      <Image
        src={image}
        alt={alt}
        fill
        sizes="(max-width: 768px) 90vw, 360px"
        className="object-cover brightness-[1.05] contrast-[0.95]"
        priority={!mirrored}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-olive/75 via-olive/15 to-transparent" />

      <div className="absolute left-1/2 top-8 -translate-x-1/2">
        <span className="inline-flex rounded-full bg-cream px-3 py-1.5 text-xs font-semibold tracking-wide text-olive">
          {label}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-6 px-4 text-center">
        <p className="font-display text-[clamp(2.25rem,8vw,3.75rem)] font-semibold leading-[0.95] tracking-tight text-cream-50">
          {line1}
        </p>
        <p className="mt-1 font-display text-[clamp(2.25rem,8vw,3.75rem)] font-semibold leading-[0.95] tracking-tight text-cream-50">
          {line2}
        </p>
      </div>
    </div>
  );
}

/**
 * Hover flip card inspired by the Framer Card component
 * (https://framer.com/m/Card-xuoJ.js): rotateX flip with dual faces.
 */
export function HeroFlipCard() {
  const [flipped, setFlipped] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[360px] perspective-[1200px] sm:max-w-[380px]">
      <motion.button
        type="button"
        aria-label={
          flipped
            ? "Flip card back to Shared Spaces"
            : "Flip card to Better Living"
        }
        className="relative block aspect-[343/428] w-full cursor-pointer border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
        style={{ transformStyle: "preserve-3d" }}
        onMouseEnter={() => !reduceMotion && setFlipped(true)}
        onMouseLeave={() => !reduceMotion && setFlipped(false)}
        onClick={() => setFlipped((v) => !v)}
        animate={{ rotateX: flipped ? 180 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 1, ease: flipEase }
        }
      >
        <CardFace {...FRONT} />
        <CardFace {...BACK} mirrored />
      </motion.button>

      <AnimatePresence>
        {!reduceMotion && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft md:hidden"
          >
            Tap to flip
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
