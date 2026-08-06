"use client";

import { formatCurrency } from "@/lib/utils";
import type { Room } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const categoryLabel: Record<Room["category"], string> = {
  shared_bedroom: "Shared bedroom",
  private_room: "Private room",
  flat: "Flat",
};

const easeBrand: [number, number, number, number] = [0.22, 1, 0.36, 1];

function bookingBadges(room: Room) {
  const badges: string[] = [];
  if (room.allowsSharedBooking) badges.push("Per bed");
  if (room.allowsExclusiveBooking) badges.push("Whole unit");
  return badges;
}

export function RoomCard({
  room,
  index = 0,
  linked = false,
}: {
  room: Room;
  index?: number;
  linked?: boolean;
}) {
  const priceLabel = formatCurrency(room.priceFrom, room.currency);
  const badges = bookingBadges(room);
  const priceSuffix =
    room.category === "flat" ? " / night" : " / bed / night";

  const media = (
    <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
      <Image
        src={room.coverImage}
        alt={`${categoryLabel[room.category]} interior at Guestay coliving, Sadaat Town Lahore Cantt — ${room.name}`}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
      />
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-soft bg-cream/95 px-2.5 py-1 text-xs font-medium text-olive">
          {categoryLabel[room.category]}
        </span>
        {room.capacity > 0 && (
          <span className="inline-flex items-center rounded-soft bg-white/95 px-2.5 py-1 text-xs font-medium text-ink">
            Sleeps {room.capacity}
          </span>
        )}
      </div>
    </div>
  );

  const body = (
    <>
      <div>
        <h3 className="font-display text-2xl leading-snug text-ink">
          {linked ? (
            room.name
          ) : (
            <Link
              href={`/rooms/${room.slug}`}
              className="transition-colors hover:text-olive-700"
            >
              {room.name}
            </Link>
          )}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {room.tagline}
        </p>
        {badges.length > 0 && (
          <p className="mt-2 text-xs font-medium text-olive">
            {badges.join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-baseline justify-between border-t border-olive/8 pt-4">
        <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ink-soft">
          From
        </p>
        <p className="font-mono text-lg font-medium text-olive">
          {priceLabel}
          <span className="text-sm font-normal text-ink-soft">{priceSuffix}</span>
        </p>
      </div>
    </>
  );

  if (linked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{
          duration: 0.45,
          delay: index * 0.06,
          ease: easeBrand,
        }}
        whileHover={{ y: -4, scale: 1.01 }}
        className="h-full"
      >
        <Link
          href={`/rooms/${room.slug}`}
          className="group flex h-full flex-col overflow-hidden rounded-card bg-white/70 shadow-soft transition-shadow duration-300 ease-brand hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-2"
        >
          {media}
          <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">{body}</div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: easeBrand,
      }}
      className="h-full"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-card bg-white/70 shadow-soft transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift">
        <Link href={`/rooms/${room.slug}`} className="group block">
          {media}
        </Link>
        <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
          {body}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/rooms/${room.slug}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-soft bg-olive px-4 text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
            >
              View &amp; book
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
