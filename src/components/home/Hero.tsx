"use client";

import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { HeroCanvas } from "@/components/home/HeroCanvas";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { CalendarDays, Search, Users } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-paper pt-20 md:pt-24">
      {/* Soft atmospheric wash — edge-to-edge, not a card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 85% 35%, rgba(161,165,128,0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(77,80,59,0.06), transparent 50%)",
        }}
      />

      <div className="container-page relative grid min-h-[calc(100svh-5rem)] items-center gap-8 pb-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <BrandWordmark size="hero" showTagline />

          <h1 className="mt-8 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            A house you can actually live in — not just sleep through.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted md:text-lg">
            Private rooms, shared kitchens, clear monthly rates. Book direct and
            keep 10% of your security deposit.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/rooms"
              className="inline-flex h-12 items-center rounded-soft bg-olive px-6 text-base font-medium text-cream-50 shadow-soft transition-all duration-300 ease-brand hover:bg-olive-700 hover:shadow-lift"
            >
              Browse rooms
            </Link>
            <Link
              href="/promotions"
              className="inline-flex h-12 items-center rounded-soft border border-olive/20 bg-transparent px-6 text-base font-medium text-olive transition-all duration-300 ease-brand hover:border-olive/40 hover:bg-white/60"
            >
              See promotions
            </Link>
          </div>

          <form
            className="mt-10 rounded-card border border-olive/8 bg-white/90 p-3 shadow-soft backdrop-blur-sm sm:p-4"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Search availability"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <label className="flex items-center gap-2 rounded-soft bg-cream-50 px-3 py-2.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-sage-600" />
                <span className="sr-only">Check-in</span>
                <input
                  type="date"
                  defaultValue="2026-08-01"
                  className="w-full bg-transparent text-sm text-ink outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-soft bg-cream-50 px-3 py-2.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-sage-600" />
                <span className="sr-only">Check-out</span>
                <input
                  type="date"
                  defaultValue="2026-08-08"
                  className="w-full bg-transparent text-sm text-ink outline-none"
                />
              </label>
              <label className="flex items-center gap-2 rounded-soft bg-cream-50 px-3 py-2.5 sm:min-w-[7rem]">
                <Users className="h-4 w-4 shrink-0 text-sage-600" />
                <span className="sr-only">Guests</span>
                <select
                  defaultValue="1"
                  className="w-full bg-transparent text-sm text-ink outline-none"
                >
                  <option value="1">1 guest</option>
                  <option value="2">2 guests</option>
                  <option value="3">3 guests</option>
                  <option value="4">4 guests</option>
                </select>
              </label>
              <Button type="submit" className="w-full sm:w-auto" size="md">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[520px] lg:ml-auto lg:max-w-none"
        >
          {/* Bleed the 3D stage toward the right edge on large screens */}
          <div className="lg:translate-x-4 xl:translate-x-8">
            <HeroCanvas />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
