import { RoomsBrowser } from "@/components/rooms/RoomsBrowser";
import { getRooms } from "@/lib/mock";
import type { Metadata } from "next";
import Link from "next/link";

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
            What Guestay offers
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            Three categories. Full detail on each. Call or enquire to check
            availability. No date search, no online checkout.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <RoomsBrowser rooms={rooms} />
        </div>

        <p className="mt-12 text-center text-sm text-ink-muted">
          Ready to talk?{" "}
          <Link
            href="/contact"
            className="font-medium text-olive underline-offset-4 hover:underline"
          >
            Send an enquiry
          </Link>{" "}
          or call us directly.
        </p>
      </div>
    </div>
  );
}
