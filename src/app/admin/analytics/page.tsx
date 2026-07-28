import { listLocalBookings } from "@/lib/bookings/local-store";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function AdminAnalyticsPage() {
  const bookings = listLocalBookings().filter((b) =>
    ["paid", "partially_paid", "completed"].includes(b.status),
  );
  const bySource = bookings.reduce(
    (acc, b) => {
      acc[b.source] = (acc[b.source] || 0) + b.amountPaidPkr;
      return acc;
    },
    {} as Record<string, number>,
  );
  const nights = bookings.reduce((n, b) => n + b.nights, 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">
          Occupancy &amp; revenue (Owner)
        </h1>
        <Link href="/admin" className="text-sm text-olive">
          ← Bookings
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-olive/10 bg-white p-5">
          <p className="text-xs uppercase text-ink-soft">Booked nights (session)</p>
          <p className="mt-2 font-mono text-3xl text-ink">{nights}</p>
        </div>
        <div className="rounded-card border border-olive/10 bg-white p-5">
          <p className="text-xs uppercase text-ink-soft">Paid bookings</p>
          <p className="mt-2 font-mono text-3xl text-ink">{bookings.length}</p>
        </div>
      </div>
      <h2 className="mt-8 font-display text-lg text-ink">Revenue by source</h2>
      <ul className="mt-3 space-y-2">
        {Object.keys(bySource).length === 0 && (
          <li className="text-sm text-ink-muted">No paid bookings yet.</li>
        )}
        {Object.entries(bySource).map(([source, amount]) => (
          <li
            key={source}
            className="flex justify-between rounded-soft bg-white px-4 py-3 text-sm"
          >
            <span className="text-ink">{source}</span>
            <span className="font-mono text-ink">{formatCurrency(amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-soft">
        Use direct vs OTA revenue to judge whether the 10% deposit credit is
        working.
      </p>
    </div>
  );
}
