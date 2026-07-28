"use client";

import { useCart } from "@/components/booking/CartProvider";
import { useToast } from "@/components/ui/Toast";
import { quoteStay } from "@/lib/pricing";
import { formatCurrency, whatsappHref } from "@/lib/utils";
import type { BookingMode, Room, SiteContact } from "@/types";
import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BookingQuoteCard({
  room,
  contact,
}: {
  room: Room;
  contact: SiteContact;
}) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const defaultMode: BookingMode = room.allowsExclusiveBooking
    ? "exclusive"
    : "shared";
  const [mode, setMode] = useState<BookingMode>(defaultMode);
  const [checkIn, setCheckIn] = useState(addDaysISO(1));
  const [checkOut, setCheckOut] = useState(addDaysISO(3));
  const [guests, setGuests] = useState(1);

  const { quote, error } = useMemo(() => {
    try {
      return {
        quote: quoteStay({
          room,
          mode,
          checkIn,
          checkOut,
          guestCount: mode === "exclusive" ? room.capacity : guests,
          isDirect: true,
        }),
        error: null as string | null,
      };
    } catch (e) {
      return {
        quote: null,
        error: e instanceof Error ? e.message : "Invalid dates",
      };
    }
  }, [room, mode, checkIn, checkOut, guests]);

  const guestCount = mode === "exclusive" ? room.capacity : guests;

  const checkoutHref =
    quote &&
    `/checkout?room=${room.slug}&mode=${mode}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guestCount}&immediate=1`;

  function addToBooking() {
    if (!quote) return;
    addItem({
      roomId: room.id,
      roomSlug: room.slug,
      roomName: room.name,
      coverImage: room.coverImage,
      bookingMode: mode,
      checkIn,
      checkOut,
      guests: guestCount,
      bedsBooked: quote.bedsBooked,
      nights: quote.nights,
      ratePerNightPkr: quote.ratePerNightPkr,
      subtotalPkr: quote.staySubtotalPkr,
      effectivePerNightPkr: quote.effectivePerNightPkr,
    });
    toast("Added to your booking");
  }

  const waMessage = `Hi Guestay, I'm interested in ${room.name} from ${checkIn} to ${checkOut}.`;

  return (
    <div className="sticky bottom-0 z-30 -mx-5 border-t border-olive/10 bg-cream-50/95 p-4 shadow-lift backdrop-blur-md md:mx-0 md:rounded-card md:border md:border-olive/8 md:bg-white/80 md:p-6 md:shadow-lift lg:top-24 lg:bottom-auto">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-sage-700">
        Check availability
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
        Book this unit
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Pick dates to see your total and effective nightly rate.
      </p>

      {room.allowsSharedBooking && room.allowsExclusiveBooking && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("shared")}
            className={`rounded-soft px-3 py-2 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
              mode === "shared"
                ? "bg-olive text-cream-50"
                : "border border-olive/15 text-olive"
            }`}
          >
            Per bed
          </button>
          <button
            type="button"
            onClick={() => setMode("exclusive")}
            className={`rounded-soft px-3 py-2 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
              mode === "exclusive"
                ? "bg-olive text-cream-50"
                : "border border-olive/15 text-olive"
            }`}
          >
            Whole room
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        <label className="block text-sm">
          <span className="text-ink-muted">Check-in</span>
          <input
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => setCheckIn(e.target.value)}
            className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 font-mono text-sm text-ink"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">Check-out</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 font-mono text-sm text-ink"
          />
        </label>
        {mode === "shared" && (
          <label className="block text-sm">
            <span className="text-ink-muted">Beds</span>
            <input
              type="number"
              min={1}
              max={room.capacity}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 font-mono text-sm text-ink"
            />
          </label>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {quote && (
        <div className="mt-5 space-y-2 rounded-soft bg-cream-100/80 p-4 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>{quote.nights} nights</span>
            <span className="font-mono text-ink">
              {formatCurrency(quote.effectivePerNightPkr)}
              {mode === "shared" ? "/bed" : ""}/night
            </span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Stay total</span>
            <span className="font-mono font-medium text-ink">
              {formatCurrency(quote.staySubtotalPkr)}
            </span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Deposit due (direct booking credit)</span>
            <span className="font-mono text-ink">
              {formatCurrency(quote.depositDuePkr)}
            </span>
          </div>
          {quote.isGroupNoAdvance && (
            <p className="pt-1 text-xs font-medium text-olive">
              10+ guests: no advance payment required at confirm.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          disabled={!quote}
          onClick={addToBooking}
          className="inline-flex h-11 w-full items-center justify-center rounded-soft border border-olive/20 bg-white text-sm font-medium text-olive transition-all hover:scale-[1.02] hover:bg-cream-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          Add to Booking
        </button>
        {checkoutHref ? (
          <Link
            href={checkoutHref}
            className="inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98]"
          >
            Book Now
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-soft bg-olive/40 text-sm font-medium text-cream-50"
          >
            Select valid dates
          </button>
        )}
        <a
          href={`tel:${contact.phone}`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-soft border border-olive/20 bg-white text-sm font-medium text-olive transition-colors hover:bg-cream-100"
        >
          <Phone className="h-4 w-4" />
          Call {contact.phoneDisplay}
        </a>
        <a
          href={whatsappHref(contact.whatsapp, waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center justify-center gap-2 text-sm text-olive md:inline-flex"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
