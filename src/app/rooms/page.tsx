import { RoomsBrowser } from "@/components/rooms/RoomsBrowser";
import { getRooms } from "@/lib/mock";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Rooms",
  description:
    "Browse Shared Rooms, Full Personal Rooms, and Full 2-Bedroom Flats at Guestay.",
};

export default async function RoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page pb-16 md:pb-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            Rooms
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-olive md:text-5xl">
            Find your stay
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            Filter by dates, guests, and price — add rooms to your booking or
            book one now.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <Suspense fallback={<p className="text-ink-muted">Loading rooms…</p>}>
            <RoomsBrowser rooms={rooms} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
