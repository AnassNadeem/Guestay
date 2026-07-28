"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WalkInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/admin/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          guests: Number(body.guests),
          amountCollectedPkr: Number(body.amountCollectedPkr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 px-5 py-10">
      <div className="mx-auto max-w-lg rounded-card border border-olive/10 bg-white p-6">
        <h1 className="font-display text-2xl text-ink">Walk-in booking</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Logs a cash/manual booking and blocks the unit on the calendar / iCal
          export.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            name="guestName"
            required
            placeholder="Guest name"
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
          />
          <input
            name="guestPhone"
            required
            placeholder="Phone"
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
          />
          <input
            name="guestEmail"
            placeholder="Email (optional)"
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
          />
          <input
            name="roomSlug"
            required
            placeholder="Room slug e.g. shared-bedroom-a"
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
          />
          <select
            name="mode"
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
            defaultValue="exclusive"
          >
            <option value="shared">Shared (per bed)</option>
            <option value="exclusive">Exclusive</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="checkIn"
              type="date"
              required
              className="h-11 rounded-soft border border-olive/15 px-3"
            />
            <input
              name="checkOut"
              type="date"
              required
              className="h-11 rounded-soft border border-olive/15 px-3"
            />
          </div>
          <input
            name="guests"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
          />
          <input
            name="amountCollectedPkr"
            type="number"
            min={0}
            required
            placeholder="Amount collected (PKR)"
            className="h-11 w-full rounded-soft border border-olive/15 px-3"
          />
          <textarea
            name="notes"
            placeholder="Notes"
            className="min-h-[80px] w-full rounded-soft border border-olive/15 px-3 py-2"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Create walk-in booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
