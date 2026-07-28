"use client";

import { SearchPill } from "@/components/search/SearchPill";
import { motion, useReducedMotion } from "framer-motion";

const easeBrand: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Hero() {
  const reducedMotion = useReducedMotion();

  const reveal = (delay: number) =>
    reducedMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: easeBrand },
        };

  return (
    <section
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-cream-50"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 35%, rgba(255,255,255,0.85) 0%, transparent 70%), radial-gradient(50% 40% at 80% 80%, rgba(166,172,126,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-fluted opacity-40" />

      <div className="relative z-10 flex w-full flex-col items-center px-6 pb-16 pt-28 text-center sm:px-10">
        <motion.p
          className="text-[0.72rem] uppercase tracking-[0.22em] text-ink-muted"
          {...reveal(0.05)}
        >
          Shared Spaces, Better Living
        </motion.p>

        <motion.h1
          id="hero-heading"
          className="mt-5 max-w-3xl font-display text-[clamp(2.4rem,5.5vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink"
          {...reveal(0.12)}
        >
          Guestay
        </motion.h1>

        <motion.p
          className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
          {...reveal(0.2)}
        >
          Shared rooms, private rooms, and two-bedroom flats in Lahore Cantt —
          find your stay and book in minutes.
        </motion.p>

        <motion.div
          className="mt-10 flex w-full justify-center"
          {...reveal(0.3)}
        >
          <SearchPill className="w-full max-w-3xl" />
        </motion.div>
      </div>
    </section>
  );
}
