"use client";

import { SearchPill } from "@/components/search/SearchPill";
import { siteConfig } from "@/lib/siteConfig";
import { motion, useReducedMotion } from "framer-motion";

const easeBrand: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Curved floral bloom — line-art petals, mirrored per side */
function HeroFlower({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 360"
      className={`pointer-events-none absolute top-1/2 hidden h-[min(56vh,380px)] w-auto opacity-50 md:block lg:opacity-60 ${
        flip
          ? "right-2 -translate-y-1/2 -scale-x-100 lg:right-8 xl:right-14"
          : "left-2 -translate-y-1/2 lg:left-8 xl:left-14"
      }`}
      fill="none"
    >
      {/* Stem curve */}
      <path
        d="M78 340 C 72 280, 88 240, 70 190 C 52 140, 78 100, 80 48"
        stroke="currentColor"
        className="text-olive/35"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Leaf — lower left of stem */}
      <path
        d="M74 250 C 40 235, 28 200, 48 178 C 62 192, 72 220, 74 250 Z"
        stroke="currentColor"
        className="text-sage"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.12"
      />
      {/* Leaf — mid right */}
      <path
        d="M82 200 C 118 185, 128 148, 108 128 C 96 148, 88 172, 82 200 Z"
        stroke="currentColor"
        className="text-sage"
        strokeWidth="1"
        fill="currentColor"
        fillOpacity="0.1"
      />

      {/* Bloom — outer curved petals */}
      <g className="text-sage" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        <path d="M80 88 C 52 72, 38 42, 52 22 C 68 38, 76 62, 80 88 Z" fill="currentColor" fillOpacity="0.14" />
        <path d="M80 88 C 108 72, 122 42, 108 22 C 92 38, 84 62, 80 88 Z" fill="currentColor" fillOpacity="0.14" />
        <path d="M80 88 C 58 108, 30 112, 18 88 C 40 82, 62 82, 80 88 Z" fill="currentColor" fillOpacity="0.1" />
        <path d="M80 88 C 102 108, 130 112, 142 88 C 120 82, 98 82, 80 88 Z" fill="currentColor" fillOpacity="0.1" />
        <path d="M80 88 C 62 58, 70 28, 96 18 C 92 42, 88 68, 80 88 Z" fill="currentColor" fillOpacity="0.16" />
        <path d="M80 88 C 98 58, 90 28, 64 18 C 68 42, 72 68, 80 88 Z" fill="currentColor" fillOpacity="0.16" />
      </g>

      {/* Inner ring + center */}
      <circle cx="80" cy="82" r="11" className="stroke-olive/40 fill-sage/25" strokeWidth="1" />
      <circle cx="80" cy="82" r="4.5" className="fill-olive/50" />

      {/* Soft trailing bud below bloom */}
      <path
        d="M80 120 C 68 128, 64 142, 72 150 C 80 142, 88 132, 80 120 Z"
        className="stroke-sage/70 fill-sage/15"
        strokeWidth="0.9"
      />
    </svg>
  );
}

/** Stepped plinth that steps out between logo and tagline */
function HeroStep() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 48"
      className="mx-auto mt-5 h-8 w-[min(56vw,220px)] text-olive/45 sm:mt-6 sm:h-9"
      fill="none"
    >
      {/* Top step (narrow) */}
      <path
        d="M78 6 H142 V16 H78 Z"
        className="fill-sage/35 stroke-olive/30"
        strokeWidth="0.8"
      />
      {/* Mid step */}
      <path
        d="M48 16 H172 V28 H48 Z"
        className="fill-sage/25 stroke-olive/25"
        strokeWidth="0.8"
      />
      {/* Bottom step (wide) */}
      <path
        d="M18 28 H202 V40 H18 Z"
        className="fill-sage/18 stroke-olive/20"
        strokeWidth="0.8"
      />
      {/* Soft highlight edges */}
      <path
        d="M78 6 H142 M48 16 H172 M18 28 H202"
        className="stroke-cream-50/50"
        strokeWidth="0.6"
      />
      {/* Tiny center diamond accent */}
      <path
        d="M110 20 L114 24 L110 28 L106 24 Z"
        className="fill-olive/40"
      />
    </svg>
  );
}

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
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-paper"
      aria-labelledby="hero-heading"
    >
      {/* Soft sage depth — stays on-brand with page cream-green */}
      {!reducedMotion && (
        <div
          className="pointer-events-none absolute -left-1/4 top-1/4 h-[60vmin] w-[60vmin] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(166,172,126,0.28) 0%, transparent 70%)",
            animation: "guestay-blob 25s ease-in-out infinite alternate",
          }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 40%, rgba(166,172,126,0.14) 0%, transparent 70%), radial-gradient(40% 35% at 15% 75%, rgba(59,68,48,0.06) 0%, transparent 55%), radial-gradient(40% 35% at 85% 70%, rgba(59,68,48,0.05) 0%, transparent 55%)",
        }}
      />

      <HeroFlower side="left" />
      <HeroFlower side="right" />

      <div className="relative z-10 flex w-full flex-col items-center px-6 pb-16 pt-28 text-center sm:px-10">
        <motion.div className="flex justify-center" {...reveal(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark-light.png"
            alt="Guestay"
            width={280}
            height={56}
            className="h-11 w-auto sm:h-14 md:h-16"
          />
        </motion.div>

        <h1 id="hero-heading" className="sr-only">
          Guestay
        </h1>

        <motion.div {...reveal(0.06)}>
          <HeroStep />
        </motion.div>

        <motion.p
          className="mt-4 max-w-2xl text-[clamp(1.1rem,2.8vw,1.65rem)] font-medium uppercase tracking-[0.14em] text-olive sm:mt-5"
          {...reveal(0.1)}
        >
          {siteConfig.tagline}
        </motion.p>

        <motion.p
          className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
          {...reveal(0.18)}
        >
          Shared rooms, private rooms, and two-bedroom flats in Lahore Cantt.
        </motion.p>

        <motion.div
          className="mt-10 flex w-full justify-center overflow-visible"
          {...reveal(0.28)}
        >
          <SearchPill className="w-full max-w-3xl" />
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes guestay-blob {
          0% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(18%, -12%) scale(1.15);
          }
          100% {
            transform: translate(-8%, 10%) scale(0.95);
          }
        }
      `}</style>
    </section>
  );
}
