import { listLocalBookings } from "@/lib/bookings/local-store";
import { getRooms } from "@/lib/mock";
import Link from "next/link";

const sourceColor: Record<string, string> = {
  direct: "bg-olive text-cream-50",
  walk_in: "bg-sage-700 text-cream-50",
  airbnb: "bg-rose-600 text-white",
  booking_com: "bg-sky-700 text-white",
};

export default async function AdminCalendarPage() {
  const [rooms, bookings] = await Promise.all([
    getRooms(),
    listLocalBookings(),
  ]);
  const active = bookings.filter((b) =>
    ["pending_hold", "partially_paid", "paid", "confirmed_no_advance"].includes(
      b.status,
    ),
  );

  return (
    <div className="min-h-screen bg-cream-100 px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink">Unified calendar</h1>
          <Link href="/admin" className="text-sm text-olive">
            ← Bookings
          </Link>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {Object.entries(sourceColor).map(([k, cls]) => (
            <span key={k} className={`rounded-soft px-2 py-1 ${cls}`}>
              {k}
            </span>
          ))}
        </div>
        <div className="space-y-6">
          {rooms.map((room) => {
            const rows = active.filter((b) => b.roomSlug === room.slug);
            return (
              <section
                key={room.id}
                className="rounded-card border border-olive/10 bg-white p-5"
              >
                <h2 className="font-display text-lg text-ink">{room.name}</h2>
                {rows.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">No active blocks</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {rows.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span
                          className={`rounded-soft px-2 py-0.5 text-xs ${sourceColor[b.source]}`}
                        >
                          {b.source}
                        </span>
                        <span className="font-mono text-ink-muted">
                          {b.checkIn} → {b.checkOut}
                        </span>
                        <span className="text-ink">
                          {b.guestName || "OTA block"} · {b.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-ink-soft">
          OTA imports appear as blocked dates without guest details — expected
          for standard iCal sync.
        </p>
      </div>
    </div>
  );
}
