"use client";

import { useCart } from "@/components/booking/CartProvider";
import { formatCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BookingSummaryPage() {
  const { items, removeItem, updateItem, totalPkr, count } = useCart();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function continueCheckout() {
    if (items.length === 0) return;
    if (items.length === 1) {
      const i = items[0]!;
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

  function startEdit(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setEditingId(id);
    setEditIn(item.checkIn);
    setEditOut(item.checkOut);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSaving(true);
    setEditError(null);
    try {
      if (!item.bookingId) {
        throw new Error("Hold missing — remove and re-add this room");
      }
      const res = await fetch("/api/bookings/update-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: item.bookingId,
          checkIn: editIn,
          checkOut: editOut,
          guests: item.guests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dates unavailable");
      updateItem(id, {
        checkIn: editIn,
        checkOut: editOut,
        nights: data.nights,
        ratePerNightPkr: data.ratePerNightPkr,
        subtotalPkr: data.subtotalPkr,
        effectivePerNightPkr: data.effectivePerNightPkr,
        bedsBooked: data.bedsBooked,
        holdExpiresAt: data.holdExpiresAt,
      });
      setEditingId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not update dates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-3xl pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">
              Your Booking
            </h1>
            <p className="mt-2 text-ink-muted">
              {count === 0
                ? "No rooms added yet."
                : `${count} room${count !== 1 ? "s" : ""}`}
            </p>
          </div>
          {count > 0 && (
            <Link
              href="/rooms"
              className="inline-flex h-10 items-center rounded-soft border border-olive/20 px-4 text-sm font-medium text-olive"
            >
              + Add Rooms
            </Link>
          )}
        </div>

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
                        {editingId === item.id ? (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="date"
                                value={editIn}
                                onChange={(e) => setEditIn(e.target.value)}
                                className="rounded-soft border border-olive/15 px-2 py-1 font-mono text-xs"
                              />
                              <input
                                type="date"
                                value={editOut}
                                onChange={(e) => setEditOut(e.target.value)}
                                className="rounded-soft border border-olive/15 px-2 py-1 font-mono text-xs"
                              />
                            </div>
                            {editError && (
                              <p className="text-xs text-destructive">
                                {editError}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => saveEdit(item.id)}
                                className="rounded-soft bg-olive px-3 py-1.5 text-xs font-medium text-cream-50 disabled:opacity-50"
                              >
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs text-ink-muted underline"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mt-1 font-mono text-sm text-ink-muted">
                              {item.checkIn} → {item.checkOut}
                            </p>
                            <p className="mt-2 font-mono text-sm text-olive">
                              {item.nights} nights ·{" "}
                              {formatCurrency(item.subtotalPkr)}
                            </p>
                            <div className="mt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={() => startEdit(item.id)}
                                className="text-xs font-medium text-olive underline-offset-2 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-xs text-ink-muted underline-offset-2 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
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
