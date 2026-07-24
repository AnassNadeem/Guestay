"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function LivingBand() {
  return (
    <section className="relative overflow-hidden bg-olive text-cream-50">
      <div className="container-page grid gap-0 py-0 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]"
        >
          <Image
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80"
            alt="Warm shared kitchen with wood counters and morning light"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </motion.div>
        <div className="flex flex-col justify-center px-5 py-12 sm:px-10 md:py-16 lg:px-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-sage">
            How it feels
          </p>
          <h2 className="mt-4 max-w-md font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Cook. Close a door. Come back down when you want company.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-cream-200">
            We designed the house so privacy and community sit next to each
            other — not in competition. Your room is yours. The kitchen and
            lounge belong to whoever shows up.
          </p>
        </div>
      </div>
    </section>
  );
}
