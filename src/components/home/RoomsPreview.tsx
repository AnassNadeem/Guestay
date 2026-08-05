import { RoomCard } from "@/components/rooms/RoomCard";
import { formatCurrency } from "@/lib/utils";
import type { Room } from "@/types";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const typeLabel: Record<Room["type"], string> = {
  shared: "Shared bedroom",
  personal: "Private room",
  flat: "Flat",
};

/**
 * Homepage rooms tease: featured units, then a blurred peek at more stock.
 */
export function RoomsPreview({
  rooms,
  teaserRoom,
}: {
  rooms: Room[];
  teaserRoom?: Room | null;
}) {
  const peekRooms = buildPeekRow(rooms, teaserRoom);

  return (
    <section
      className="bg-paper py-section-sm md:py-section"
      aria-labelledby="rooms-preview-heading"
    >
      <div className="container-page">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-eyebrow">Our spaces</p>
            <h2
              id="rooms-preview-heading"
              className="mt-3 font-display text-3xl leading-tight text-ink md:text-[2.6rem]"
            >
              Rooms and flats, bookable by the night
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Shared bedrooms (per bed or whole room), and full flats for longer
              stays. Pick dates to see your total before you reserve.
            </p>
          </div>

          <Link
            href="/rooms"
            className="group hidden items-center gap-2 text-sm font-medium text-olive transition-colors hover:text-olive-700 sm:inline-flex"
          >
            Compare every room
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-brand group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, i) => (
            <RoomCard key={room.id} room={room} index={i} linked />
          ))}
        </div>

        {/* Frosted peek at what is behind the "view all" door */}
        <div className="relative mt-6 md:mt-8">
          <div
            className="pointer-events-none h-[210px] overflow-hidden sm:h-[230px]"
            aria-hidden
            style={{
              maskImage:
                "linear-gradient(to bottom, black 0%, black 45%, transparent 96%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, black 45%, transparent 96%)",
            }}
          >
            <div className="grid gap-6 blur-[5px] saturate-[0.85] sm:grid-cols-2 lg:grid-cols-3">
              {peekRooms.map((room, i) => (
                <PeekCard key={`${room.id}-${i}`} room={room} />
              ))}
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/30 via-cream/80 to-cream"
              aria-hidden
            />
            <p className="relative max-w-sm text-sm text-ink-muted">
              More rooms, live availability, and exact monthly rates.
            </p>
            <Link
              href="/rooms"
              className="group relative inline-flex h-12 items-center gap-2 rounded-full bg-olive px-7 text-[0.95rem] font-medium text-cream-50 shadow-lift transition-all duration-200 ease-brand hover:bg-olive-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 focus-visible:ring-offset-2"
            >
              View all rooms
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-brand group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Fills the frosted row to three cards, preferring rooms not shown above. */
function buildPeekRow(rooms: Room[], teaserRoom?: Room | null): Room[] {
  const shownIds = new Set(rooms.map((r) => r.id));
  const extras = teaserRoom && !shownIds.has(teaserRoom.id) ? [teaserRoom] : [];
  const pool = [...extras, ...rooms];
  return Array.from({ length: 3 }, (_, i) => pool[i % pool.length]).filter(
    Boolean,
  );
}

function PeekCard({ room }: { room: Room }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-white/60 shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
        <Image
          src={room.coverImage}
          alt={`${room.name} at Guestay coliving, Sadaat Town Lahore Cantt`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-soft bg-cream/95 px-2.5 py-1 text-xs font-medium text-olive">
            {typeLabel[room.type]}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-5">
        <p className="font-serif text-xl text-ink">{room.name}</p>
        <p className="text-sm text-olive">
          From {formatCurrency(room.priceFrom, room.currency)}
        </p>
      </div>
    </div>
  );
}
