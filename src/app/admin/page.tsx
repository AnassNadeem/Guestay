import { listLocalBookings } from "@/lib/bookings/local-store";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const statusTone: Record<string, string> = {
  pending_hold: "bg-amber-100 text-amber-900",
  partially_paid: "bg-sky-100 text-sky-900",
  paid: "bg-emerald-100 text-emerald-900",
  confirmed_no_advance: "bg-violet-100 text-violet-900",
  cancelled: "bg-stone-200 text-stone-800",
  completed: "bg-olive/15 text-olive",
  expired_hold: "bg-stone-100 text-stone-600",
};

export default function AdminHomePage() {
  const bookings = listLocalBookings();
  const revenueBySource = bookings
    .filter((b) => ["paid", "partially_paid", "completed"].includes(b.status))
    .reduce(
      (acc, b) => {
        acc[b.source] = (acc[b.source] || 0) + b.amountPaidPkr;
        return acc;
      },
      {} as Record<string, number>,
    );

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="border-b border-olive/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
              Guestay admin
            </p>
            <h1 className="font-display text-xl text-ink">Operations</h1>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin" className="font-medium text-olive">
              Bookings
            </Link>
            <Link href="/admin/calendar" className="text-ink-muted hover:text-olive">
              Calendar
            </Link>
            <Link href="/admin/rooms" className="text-ink-muted hover:text-olive">
              Rooms
            </Link>
            <Link href="/admin/walk-in" className="text-ink-muted hover:text-olive">
              Walk-in
            </Link>
            <Link href="/admin/ota" className="text-ink-muted hover:text-olive">
              OTA sync
            </Link>
            <Link href="/admin/audit" className="text-ink-muted hover:text-olive">
              Audit
            </Link>
            <Link href="/admin/analytics" className="text-ink-muted hover:text-olive">
              Analytics
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">Bookings CRM</h2>
          <Link
            href="/admin/walk-in"
            className="rounded-soft bg-olive px-4 py-2 text-sm font-medium text-cream-50"
          >
            Add walk-in
          </Link>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {Object.entries(revenueBySource).map(([source, amount]) => (
            <div
              key={source}
              className="rounded-card border border-olive/10 bg-white p-4"
            >
              <p className="text-xs uppercase tracking-wide text-ink-soft">
                {source} revenue
              </p>
              <p className="mt-1 font-mono text-lg text-ink">
                {formatCurrency(amount)}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-card border border-olive/10 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-olive/10 bg-cream-50 text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Paid</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-ink-muted">
                    No bookings yet. Create one from the public checkout or
                    walk-in form.
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-olive/5">
                  <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{b.guestName}</div>
                    <div className="text-xs text-ink-soft">{b.guestPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">{b.roomName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {b.checkIn} → {b.checkOut}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{b.source}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-soft px-2 py-0.5 text-xs font-medium ${statusTone[b.status] || ""}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatCurrency(b.amountPaidPkr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Owner-only: pricing edits and audit log. Manager/Staff: bookings,
          walk-in, calendar, OTA monitor. Enforce roles via Supabase RLS when
          connected; this UI ships against the local booking store until then.
        </p>
      </main>
    </div>
  );
}
