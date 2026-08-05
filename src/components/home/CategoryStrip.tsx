"use client";

import { formatCurrency } from "@/lib/utils";
import type { Room } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";

export function CategoryStrip({ rooms }: { rooms: Room[] }) {
  return (
    <Section
      eyebrow="Rooms"
      title="Three ways to stay"
      description="Shared rooms, a full personal room, or a 2-bedroom flat. Pick the fit, then call us to check availability."
      actions={
        <Link
          href="/rooms"
          className="text-sm font-medium text-olive underline-offset-4 hover:underline"
        >
          View all rooms
        </Link>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {rooms.map((room, i) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.45,
              delay: i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link href={`/rooms/${room.slug}`} className="group block h-full">
              <article className="flex h-full flex-col overflow-hidden rounded-card bg-white/65 shadow-soft transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
                  <Image
                    src={room.coverImage}
                    alt={`${room.name} at Guestay coliving, Sadaat Town Lahore Cantt`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {room.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {room.tagline}
                  </p>
                  <p className="mt-4 font-mono text-sm text-olive">
                    From {formatCurrency(room.priceFrom, room.currency)}
                    <span className="text-ink-soft"> / month</span>
                  </p>
                </div>
              </article>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
