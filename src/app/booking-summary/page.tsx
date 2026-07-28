"use client";

import { useCart } from "@/components/booking/CartProvider";
import { quoteStay } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { getRoomsSync } from "@/lib/mock/rooms-client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BookingSummaryPage() {
  const { items, removeItem, updateItem, totalPkr, count } = useCart();
  const router = useRouter();

  function continueCheckout() {
    if (items.length === 0) return;
    if (items.length === 1) {
      const i = items[0];
      const params = new URLSearchParams({
        room: i.roomSlug,
        mode: i.bookingMode,
        checkIn: i.checkIn,
        checkOut: i.checkOut,
        guests: String(i.guests),
        cart: "1",
      });
      router.push(`/checkout?${params.toString()}`);
      return;
    }
    router.push("/checkout?cart=1");
  }

  async function onDatesChange(
    id: string,
    checkIn: string,
    checkOut: string,
  ) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const rooms = await getRoomsSync();
    const room = rooms.find((r) => r.id === item.roomId || r.slug === item.roomSlug);
    if (!room) {
      updateItem(id, { checkIn, checkOut });
      return;
    }
    try {
      const q = quoteStay({
        room,
        mode: item.bookingMode,
        checkIn,
        checkOut,
        guestCount: item.guests,
        isDirect: true,
      });
      updateItem(id, {
        checkIn,
        checkOut,
        nights: q.nights,
        ratePerNightPkr: q.ratePerNightPkr,
        subtotalPkr: q.staySubtotalPkr,
        effectivePerNightPkr: q.effectivePerNightPkr,
        bedsBooked: q.bedsBooked,
      });
    } catch {
      updateItem(id, { checkIn, checkOut });
    }
  }

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-3xl pb-24">
        <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">
          Your Booking
        </h1>
        <p className="mt-2 text-ink-muted">
          {count === 0
            ? "No rooms added yet."
            : `${count} room${count !== 1 ? "s" : ""} · itemized by date range`}
        </p>

        {count === 0 ? (
          <Link
            href="/rooms"
            className="mt-8 inline-flex h-11 items-center rounded-soft bg-olive px-6 text-sm font-medium text-cream-50"
          >
            Browse rooms
          </Link>
        ) : (
          <>
            <ul className="mt-8 space-y-4">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-4 rounded-card border border-olive/10 bg-white/80 p-4 shadow-soft">
                      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-soft bg-cream-200">
                        <Image
                          src={item.coverImage}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg text-ink">
                          {item.roomName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            type="date"
                            value={item.checkIn}
                            onChange={(e) =>
                              onDatesChange(item.id, e.target.value, item.checkOut)
                            }
                            className="rounded-soft border border-olive/15 px-2 py-1 font-mono text-xs"
                          />
                          <input
                            type="date"
                            value={item.checkOut}
                            onChange={(e) =>
                              onDatesChange(item.id, item.checkIn, e.target.value)
                            }
                            className="rounded-soft border border-olive/15 px-2 py-1 font-mono text-xs"
                          />
                        </div>
                        <p className="mt-2 font-mono text-sm text-olive">
                          {item.nights} nights · {formatCurrency(item.subtotalPkr)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="mt-2 text-xs text-ink-muted underline-offset-2 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="mt-8 flex items-center justify-between border-t border-olive/10 pt-6">
              <p className="text-ink-muted">Grand total</p>
              <p className="font-mono text-2xl font-medium text-olive">
                {formatCurrency(totalPkr)}
              </p>
            </div>

            <button
              type="button"
              onClick={continueCheckout}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98] sm:w-auto sm:px-10"
            >
              Continue to Checkout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
