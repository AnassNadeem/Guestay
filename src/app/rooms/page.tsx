import { RoomsBrowser } from "@/components/rooms/RoomsBrowser";
import { getRooms } from "@/lib/mock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rooms & Rates",
  description:
    "Browse private rooms, shared bunks, studios, and suites at Guestay — with clear nightly and monthly rates.",
};

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="bg-surface-warm pt-24 md:pt-28">
      <div className="container-page pb-16 md:pb-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            Rooms & rates
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-olive md:text-5xl">
            Find a room that fits how you live
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            Nightly rates for short stays. Monthly rates from 28 nights.
            Security deposits are listed on each room — book direct for 10% off.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <RoomsBrowser rooms={rooms} />
        </div>
      </div>
    </div>
  );
}
