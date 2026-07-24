"use client";

import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import type { AvailabilityStatus, Room } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const availabilityLabel: Record<AvailabilityStatus, string> = {
  available: "Available",
  limited: "Limited",
  waitlist: "Waitlist",
  booked: "Booked",
};

const typeLabel: Record<Room["type"], string> = {
  private: "Private",
  shared: "Shared",
  studio: "Studio",
  suite: "Suite",
};

export function RoomCard({
  room,
  index = 0,
  featured = false,
}: {
  room: Room;
  index?: number;
  featured?: boolean;
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
      <Link href={`/rooms/${room.slug}`} className="group block h-full">
        <article className="flex h-full flex-col overflow-hidden rounded-card bg-white shadow-soft transition-all duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift">
          <div
            className={`relative overflow-hidden bg-cream-200 ${
              featured
                ? "aspect-[4/5] sm:aspect-[5/4] lg:min-h-[32rem] lg:flex-1 lg:aspect-auto"
                : "aspect-[4/3]"
            }`}
          >
            <Image
              src={room.coverImage}
              alt={room.name}
              fill
              sizes={
                featured
                  ? "(max-width: 1024px) 100vw, 50vw"
                  : "(max-width: 768px) 100vw, 33vw"
              }
              className="object-cover transition-transform duration-500 ease-brand group-hover:scale-[1.03]"
            />
            <div className="absolute left-3 top-3 flex gap-2">
              <Badge tone="cream">{typeLabel[room.type]}</Badge>
              <Badge tone={room.availability}>
                {availabilityLabel[room.availability]}
              </Badge>
            </div>
          </div>
          <div className={`flex flex-col gap-3 ${featured ? "p-6 md:p-7" : "p-5"}`}>
            <div>
              <h3
                className={`font-display font-semibold text-ink ${
                  featured ? "text-2xl md:text-3xl" : "text-xl"
                }`}
              >
                {room.name}
              </h3>
              <p
                className={`mt-1.5 leading-relaxed text-ink-muted ${
                  featured ? "line-clamp-3 text-base" : "line-clamp-2 text-sm"
                }`}
              >
                {room.tagline}
              </p>
            </div>
            <div className="mt-auto flex items-end justify-between border-t border-olive/5 pt-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                  From
                </p>
                <p className="font-mono text-lg font-medium text-olive">
                  {formatCurrency(room.pricePerNight)}
                  <span className="text-sm font-normal text-ink-soft">
                    {" "}
                    / night
                  </span>
                </p>
              </div>
              <p className="text-sm text-ink-muted">
                {formatCurrency(room.pricePerMonth)}
                <span className="text-ink-soft"> / mo</span>
              </p>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
