"use client";

import { useCart, type CartItem } from "@/components/booking/CartProvider";
import { cn, formatCurrency } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function BookingSummaryPage() {
  const { items, removeItem, updateItem, count } = useCart();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const multi = count >= 2;

  // Drop selection for removed items; never auto-select
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      Array.from(prev).forEach((id) => {
        if (items.some((i) => i.id === id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );
  const selectedTotal = selectedItems.reduce((s, i) => s + i.subtotalPkr, 0);
  const allSelected = multi && items.length > 0 && selected.size === items.length;

  function goCheckout(targets: CartItem[]) {
    if (targets.length === 0) return;
    const params = new URLSearchParams({ cart: "1" });
    params.set("ids", targets.map((t) => t.id).join(","));
    if (targets.length === 1) {
      const i = targets[0]!;
      params.set("room", i.roomSlug);
      params.set("mode", i.bookingMode);
      params.set("checkIn", i.checkIn);
      params.set("checkOut", i.checkOut);
      params.set("guests", String(i.guests));
    }
    router.push(`/checkout?${params.toString()}`);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((i) => i.id)));
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
      const res = await fetch(
        `/api/quote?room=${encodeURIComponent(item.roomSlug)}&mode=${item.bookingMode}&checkIn=${encodeURIComponent(editIn)}&checkOut=${encodeURIComponent(editOut)}&guests=${item.guests}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dates unavailable");
      updateItem(id, {
        checkIn: editIn,
        checkOut: editOut,
        nights: data.nights,
        ratePerNightPkr: data.ratePerNightPkr ?? data.effectivePerNightPkr,
        subtotalPkr: data.staySubtotalPkr,
        effectivePerNightPkr: data.effectivePerNightPkr,
        bedsBooked: data.bedsBooked ?? item.bedsBooked,
        bookingId: undefined,
        holdExpiresAt: null,
        reference: undefined,
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
      <div
        className={cn(
          "container-page max-w-3xl",
          multi && selected.size > 0 ? "pb-36" : "pb-24",
        )}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">
              Saved
            </h1>
            {count === 0 && (
              <p className="mt-2 text-ink-muted">No rooms saved yet.</p>
            )}
          </div>
          {count > 0 && (
            <Link
              href="/rooms"
              className="inline-flex h-10 items-center rounded-soft border border-olive/20 px-4 text-sm font-medium text-olive"
            >
              + Save more
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
            {multi && (
              <label className="mt-8 flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-olive"
                />
                Select all
              </label>
            )}
            <ul className={cn("space-y-4", multi ? "mt-4" : "mt-8")}>
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const isChecked = selected.has(item.id);
                  return (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-card border bg-white/80 p-4 shadow-soft sm:gap-4",
                          multi && isChecked
                            ? "border-sage/50 bg-sage/5"
                            : "border-olive/10",
                        )}
                      >
                        {multi && (
                          <label className="flex shrink-0 items-center self-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelected(item.id)}
                              className="h-4 w-4 accent-olive"
                              aria-label={`Select ${item.roomName}`}
                            />
                          </label>
                        )}

                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-soft bg-cream-200 sm:w-28">
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
                                  {saving ? "Saving…" : "Update"}
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

                        {editingId !== item.id && (
                          <div className="flex shrink-0 flex-col justify-center">
                            <button
                              type="button"
                              onClick={() => goCheckout([item])}
                              className="inline-flex h-10 items-center justify-center rounded-soft bg-olive px-4 text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98]"
                            >
                              Book
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            {!multi && (
              <p className="mt-6 text-xs text-ink-soft">
                Saved rooms aren&apos;t held until you book.
              </p>
            )}

            {multi && selected.size === 0 && (
              <p className="mt-6 text-sm text-ink-muted">
                Select rooms with the checkboxes, or tap{" "}
                <span className="font-medium text-ink">Book</span> on a card for
                that room alone.
              </p>
            )}
          </>
        )}
      </div>

      {multi && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-olive/10 bg-cream-50/95 backdrop-blur-md">
          <div className="container-page flex max-w-3xl flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm text-ink">
                {selected.size} room{selected.size !== 1 ? "s" : ""} selected
              </p>
              <p className="font-mono text-sm text-olive">
                {formatCurrency(selectedTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => goCheckout(selectedItems)}
              className="inline-flex h-11 items-center justify-center rounded-soft bg-olive px-6 text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98]"
            >
              Book selected ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
