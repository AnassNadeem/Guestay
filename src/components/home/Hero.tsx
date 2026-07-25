"use client";

import { HeroFlipCard } from "@/components/home/HeroFlipCard";
import { motion } from "framer-motion";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-paper pt-20 md:pt-24">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 78% 40%, rgba(166,172,126,0.28), transparent 58%), radial-gradient(ellipse 45% 35% at 12% 78%, rgba(59,68,48,0.07), transparent 52%)",
        }}
      />

      <div className="container-page relative grid min-h-[calc(100svh-5rem)] items-center gap-10 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-lg"
        >
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-olive sm:text-xs sm:tracking-[0.32em]">
            Shared spaces · Better living
          </p>

          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
            Live here. Call to stay.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            Shared rooms, personal rooms, and 2-bedroom flats. Browse what we
            offer, then call us to book.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/rooms"
              className="inline-flex h-12 items-center rounded-soft bg-olive px-6 text-base font-medium text-cream-50 shadow-soft transition-all duration-300 ease-brand hover:bg-olive-700 hover:shadow-lift"
            >
              View Rooms
            </Link>
            <a
              href="tel:+15550198240"
              className="inline-flex h-12 items-center rounded-soft border border-olive/25 bg-transparent px-6 text-base font-medium text-olive transition-all duration-300 ease-brand hover:border-olive/45 hover:bg-white/50"
            >
              Call us
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex w-full justify-center lg:justify-end"
        >
          <HeroFlipCard />
        </motion.div>
      </div>
    </section>
  );
}
