"use client";

import { formatCurrency } from "@/lib/utils";
import type { Room } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const typeLabel: Record<Room["type"], string> = {
  shared: "Shared",
  personal: "Personal",
  flat: "2-Bedroom Flat",
};

export function RoomCard({
  room,
  index = 0,
}: {
  room: Room;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="h-full"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-card bg-white/70 shadow-soft transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift">
        <Link href={`/rooms/${room.slug}`} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
            <Image
              src={room.coverImage}
              alt={room.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
            />
            <div className="absolute left-3 top-3">
              <span className="inline-flex items-center rounded-soft bg-cream/95 px-2.5 py-1 text-xs font-medium text-olive">
                {typeLabel[room.type]}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              <Link
                href={`/rooms/${room.slug}`}
                className="transition-colors hover:text-olive-700"
              >
                {room.name}
              </Link>
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
              {room.tagline}
            </p>
          </div>

          <div className="mt-auto border-t border-olive/8 pt-4">
            <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              From
            </p>
            <p className="mt-0.5 font-mono text-lg font-medium text-olive">
              {formatCurrency(room.priceFrom, room.currency)}
              <span className="text-sm font-normal text-ink-soft"> / month</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/rooms/${room.slug}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-soft bg-olive px-4 text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
            >
              View Details
            </Link>
            <Link
              href={`/contact?room=${room.slug}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-soft border border-olive/20 px-4 text-sm font-medium text-olive transition-colors hover:bg-white/60"
            >
              Enquire
            </Link>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
