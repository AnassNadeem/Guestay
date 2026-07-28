"use client";

import { useCart } from "@/components/booking/CartProvider";
import { NumberStepper } from "@/components/search/NumberStepper";
import { SearchPill } from "@/components/search/SearchPill";
import { useToast } from "@/components/ui/Toast";
import { quoteStay } from "@/lib/pricing";
import { cn, formatCurrency } from "@/lib/utils";
import type { Room } from "@/types";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const categoryLabel: Record<Room["category"], string> = {
  shared_bedroom: "Shared bedroom",
  private_room: "Private room",
  flat: "Flat",
};

type Availability = "available" | "unavailable" | "all";
type SortKey = "price_asc" | "price_desc" | "beds_asc" | "beds_desc";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const span = Math.max(max - min, 1);
  const left = ((lo - min) / span) * 100;
  const right = ((hi - min) / span) * 100;

  return (
    <div className="space-y-3">
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-olive/15" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sage/70"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={lo}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange([Math.min(n, hi - 100), hi]);
          }}
          className="price-range-thumb absolute inset-0 z-10 w-full appearance-none bg-transparent"
          aria-label="Minimum price"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={hi}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange([lo, Math.max(n, lo + 100)]);
          }}
          className="price-range-thumb absolute inset-0 z-20 w-full appearance-none bg-transparent"
          aria-label="Maximum price"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={lo}
          min={min}
          max={hi}
          onChange={(e) =>
            onChange([Math.min(Number(e.target.value) || min, hi - 100), hi])
          }
          className="w-full rounded-soft border border-olive/15 bg-white px-2 py-1.5 font-mono text-sm"
        />
        <span className="text-ink-soft">–</span>
        <input
          type="number"
          value={hi}
          min={lo}
          max={max}
          onChange={(e) =>
            onChange([lo, Math.max(Number(e.target.value) || max, lo + 100)])
          }
          className="w-full rounded-soft border border-olive/15 bg-white px-2 py-1.5 font-mono text-sm"
        />
      </div>
    </div>
  );
}

function RoomResultCard({
  room,
  index,
  checkIn,
  checkOut,
  guests,
  reveal,
}: {
  room: Room;
  index: number;
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  reveal: boolean;
}) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const reduced = useReducedMotion();
  const mode =
    room.allowsExclusiveBooking
      ? ("exclusive" as const)
      : ("shared" as const);

  const quote =
    checkIn && checkOut
      ? quoteStay({
          room,
          mode,
          checkIn,
          checkOut,
          guestCount: guests,
          isDirect: true,
        })
      : null;

  function addToBooking() {
    const ci = checkIn ?? defaultCheckIn();
    const co = checkOut ?? defaultCheckOut(ci);
    const q = quoteStay({
      room,
      mode,
      checkIn: ci,
      checkOut: co,
      guestCount: guests,
      isDirect: true,
    });
    addItem({
      roomId: room.id,
      roomSlug: room.slug,
      roomName: room.name,
      coverImage: room.coverImage,
      bookingMode: mode,
      checkIn: ci,
      checkOut: co,
      guests,
      bedsBooked: q.bedsBooked,
      nights: q.nights,
      ratePerNightPkr: q.ratePerNightPkr,
      subtotalPkr: q.staySubtotalPkr,
      effectivePerNightPkr: q.effectivePerNightPkr,
    });
    toast("Added to your booking");
  }

  const bookNowHref = (() => {
    const ci = checkIn ?? defaultCheckIn();
    const co = checkOut ?? defaultCheckOut(ci);
    const params = new URLSearchParams({
      room: room.slug,
      mode,
      checkIn: ci,
      checkOut: co,
      guests: String(guests),
      immediate: "1",
    });
    return `/checkout?${params.toString()}`;
  })();

  return (
    <motion.article
      layout
      initial={reveal && !reduced ? { opacity: 0, y: 12 } : false}
      whileInView={reveal ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-white/80 shadow-soft transition-all duration-150 ease-brand hover:-translate-y-1 hover:shadow-lift"
    >
      <Link href={`/rooms/${room.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-cream-200">
        <Image
          src={room.coverImage}
          alt={room.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-300 ease-brand group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-soft bg-cream/95 px-2.5 py-1 text-xs font-medium text-olive">
          {categoryLabel[room.category]}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Link
            href={`/rooms/${room.slug}`}
            className="font-display text-xl text-ink hover:text-olive-700"
          >
            {room.name}
          </Link>
          <p className="mt-1 text-xs text-ink-muted">
            Sleeps {room.capacity}
            {room.beds > 0 ? ` · ${room.beds} beds` : ""}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
            {room.tagline}
          </p>
        </div>
        <p className="mt-auto font-mono text-lg font-medium text-olive">
          {formatCurrency(quote?.effectivePerNightPkr ?? room.priceFrom)}
          <span className="text-sm font-normal text-ink-soft"> / night</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addToBooking}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-soft border border-olive/20 px-3 text-sm font-medium text-olive transition-all hover:scale-[1.02] hover:bg-white active:scale-[0.98]"
          >
            Add to Booking
          </button>
          <Link
            href={bookNowHref}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-soft bg-olive px-3 text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98]"
          >
            Book Now
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function defaultCheckIn() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function defaultCheckOut(ci: string) {
  const d = new Date(`${ci}T12:00:00`);
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

export function RoomsBrowser({ rooms }: { rooms: Room[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability>("available");
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [checkIn, setCheckIn] = useState<string | null>(
    searchParams.get("checkin"),
  );
  const [checkOut, setCheckOut] = useState<string | null>(
    searchParams.get("checkout"),
  );
  const [guests, setGuests] = useState(
    Number(searchParams.get("guests") || 1) || 1,
  );
  const [roomsNeeded, setRoomsNeeded] = useState(
    Number(searchParams.get("rooms") || 1) || 1,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [revealed, setRevealed] = useState(true);

  const priceBounds = useMemo(() => {
    const prices = rooms.map((r) => r.priceFrom);
    return {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 10000),
    };
  }, [rooms]);

  const [priceRange, setPriceRange] = useState<[number, number]>([
    priceBounds.min,
    priceBounds.max,
  ]);
  const debouncedPrice = useDebounced(priceRange, 300);

  useEffect(() => {
    setPriceRange([priceBounds.min, priceBounds.max]);
  }, [priceBounds.min, priceBounds.max]);

  const filtered = useMemo(() => {
    let list = rooms.filter(
      (r) =>
        r.priceFrom >= debouncedPrice[0] && r.priceFrom <= debouncedPrice[1],
    );
    if (availability === "available") {
      list = list.filter((r) => r.status === "active");
    } else if (availability === "unavailable") {
      list = list.filter((r) => r.status !== "active");
    }
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.priceFrom - b.priceFrom;
        case "price_desc":
          return b.priceFrom - a.priceFrom;
        case "beds_asc":
          return a.beds - b.beds;
        case "beds_desc":
          return b.beds - a.beds;
      }
    });
    return list;
  }, [rooms, debouncedPrice, availability, sort]);

  const [displayCount, setDisplayCount] = useState(filtered.length);
  useEffect(() => {
    setDisplayCount(filtered.length);
  }, [filtered.length]);

  function clearAll() {
    setAvailability("available");
    setSort("price_asc");
    setPriceRange([priceBounds.min, priceBounds.max]);
    setCheckIn(null);
    setCheckOut(null);
    setGuests(1);
    setRoomsNeeded(1);
    router.push("/rooms");
  }

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Availability
        </p>
        <div className="flex rounded-full border border-olive/15 bg-white p-1">
          {(
            [
              ["available", "Available"],
              ["unavailable", "Unavailable"],
              ["all", "All"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setAvailability(key)}
              className={cn(
                "flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors",
                availability === key
                  ? "bg-olive text-cream-50"
                  : "text-ink-muted hover:text-olive",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Sort
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["price_asc", "Price ↑"],
              ["price_desc", "Price ↓"],
              ["beds_asc", "Beds ↑"],
              ["beds_desc", "Beds ↓"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSort(key);
                setRevealed(false);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                sort === key
                  ? "bg-sage/30 text-olive"
                  : "bg-white text-ink-muted hover:bg-cream-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Price range
        </p>
        <PriceRangeSlider
          min={priceBounds.min}
          max={priceBounds.max}
          value={priceRange}
          onChange={setPriceRange}
        />
      </div>

      <div>
        <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
          Dates
        </p>
        <SearchPill
          compact
          initial={{ checkIn, checkOut, guests, rooms: roomsNeeded }}
          onSearch={(v) => {
            setCheckIn(v.checkIn);
            setCheckOut(v.checkOut);
            setGuests(v.guests);
            setRoomsNeeded(v.rooms);
            const params = new URLSearchParams();
            if (v.checkIn) params.set("checkin", v.checkIn);
            if (v.checkOut) params.set("checkout", v.checkOut);
            params.set("guests", String(v.guests));
            params.set("rooms", String(v.rooms));
            router.push(`/rooms?${params.toString()}`);
          }}
        />
      </div>

      <div className="flex gap-6">
        <NumberStepper label="Guests" value={guests} onChange={setGuests} />
        <NumberStepper
          label="Rooms"
          value={roomsNeeded}
          onChange={setRoomsNeeded}
        />
      </div>

      <button
        type="button"
        onClick={clearAll}
        className="text-sm text-olive underline-offset-4 hover:underline"
      >
        Clear all
      </button>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-card border border-olive/10 bg-white/70 p-5 shadow-soft">
          {filters}
        </div>
      </aside>

      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.span
                key={displayCount}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="inline-block font-medium text-ink"
              >
                {displayCount}
              </motion.span>
            </AnimatePresence>{" "}
            rooms available
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-olive/15 bg-white px-4 py-2 text-sm text-olive lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>

        <LayoutGroup>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((room, i) => (
              <RoomResultCard
                key={room.id}
                room={room}
                index={i}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                reveal={revealed}
              />
            ))}
          </div>
        </LayoutGroup>

        {filtered.length === 0 && (
          <p className="rounded-card border border-dashed border-olive/20 bg-white/50 p-10 text-center text-ink-muted">
            No rooms match these filters.
          </p>
        )}
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[88svh] overflow-y-auto rounded-t-2xl bg-cream-50 p-5 shadow-lift lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-lg text-ink">Filters</p>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full p-2 text-olive hover:bg-sage/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filters}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
