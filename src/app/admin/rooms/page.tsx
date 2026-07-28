import { getRooms } from "@/lib/mock";
import Link from "next/link";

export default async function AdminRoomsPage() {
  const rooms = await getRooms({ status: "active" });

  return (
    <div className="min-h-screen bg-cream-100 px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl text-ink">Rooms (Owner)</h1>
          <Link href="/admin" className="text-sm text-olive">
            ← Bookings
          </Link>
        </div>
        <p className="mb-6 text-sm text-ink-muted">
          Pricing tiers are editable in Supabase / Owner tools when connected.
          Below is the current catalog (including shared + exclusive modes).
        </p>
        <div className="space-y-4">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="rounded-card border border-olive/10 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="font-display text-lg text-ink">{room.name}</h2>
                <span className="text-xs text-ink-soft">{room.status}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{room.slug}</p>
              <p className="mt-2 text-sm text-ink">
                Capacity {room.capacity} · Shared{" "}
                {room.allowsSharedBooking ? "yes" : "no"} · Exclusive{" "}
                {room.allowsExclusiveBooking ? "yes" : "no"}
              </p>
              <ul className="mt-3 space-y-1 text-xs font-mono text-ink-muted">
                {room.pricing.map((p) => (
                  <li key={p.bookingMode}>
                    {p.bookingMode}: {p.tier1RatePkr}/{p.tier2RatePkr}/
                    {p.tier3RatePkr}/{p.tier4RatePkr} · deposit{" "}
                    {p.securityDepositPkr} · breaks {p.breakpointT2}/
                    {p.breakpointT3}/{p.breakpointT4}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
