"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calculateStayQuote } from "@/lib/mock";
import { formatCurrency } from "@/lib/utils";
import type { Room } from "@/types";
import { useMemo, useState } from "react";

export function BookingCard({ room }: { room: Room }) {
  const [checkIn, setCheckIn] = useState("2026-08-01");
  const [checkOut, setCheckOut] = useState("2026-08-08");
  const [guests, setGuests] = useState(1);
  const [directDiscount, setDirectDiscount] = useState(true);

  const quote = useMemo(
    () =>
      calculateStayQuote({
        pricePerNight: room.pricePerNight,
        securityDeposit: room.securityDeposit,
        checkIn,
        checkOut,
        applyDirectDepositDiscount: directDiscount,
      }),
    [room, checkIn, checkOut, directDiscount],
  );

  return (
    <Card className="sticky top-24 border border-olive/8 shadow-lift">
      <div className="flex items-baseline justify-between gap-3">
        <p>
          <span className="font-mono text-2xl font-medium text-olive">
            {formatCurrency(room.pricePerNight)}
          </span>
          <span className="text-sm text-ink-soft"> / night</span>
        </p>
        <p className="text-sm text-ink-muted">
          {formatCurrency(room.pricePerMonth)}/mo
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
            Check-in
          </span>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
            Check-out
          </span>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
            Guests
          </span>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
          >
            {Array.from({ length: room.capacity }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-soft bg-sage/15 px-3 py-3">
        <input
          type="checkbox"
          checked={directDiscount}
          onChange={(e) => setDirectDiscount(e.target.checked)}
          className="mt-1 accent-olive"
        />
        <span className="text-sm leading-snug text-ink">
          Book direct — apply 10% off security deposit
        </span>
      </label>

      <dl className="mt-5 space-y-2.5 border-t border-olive/8 pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">
            {formatCurrency(room.pricePerNight)} × {quote.nights} nights
          </dt>
          <dd className="font-mono text-ink">{formatCurrency(quote.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Security deposit</dt>
          <dd className="font-mono text-ink">
            {formatCurrency(quote.securityDeposit)}
          </dd>
        </div>
        {quote.depositDiscount > 0 && (
          <div className="flex justify-between gap-4 text-sage-700">
            <dt>Direct booking credit</dt>
            <dd className="font-mono">−{formatCurrency(quote.depositDiscount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-olive/8 pt-3 text-base font-medium">
          <dt className="text-ink">Due today (preview)</dt>
          <dd className="font-mono text-olive">
            {formatCurrency(quote.totalDueToday)}
          </dd>
        </div>
      </dl>

      <Button className="mt-5 w-full" size="lg" type="button" disabled>
        Reserve
      </Button>
      <p className="mt-3 text-center text-xs text-ink-soft">
        Live checkout ships next. This quote updates as you change dates.
      </p>
    </Card>
  );
}
