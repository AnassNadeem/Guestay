import { BookingQuoteCard } from "@/components/rooms/BookingQuoteCard";
import { RoomGallery } from "@/components/rooms/RoomGallery";
import { Badge } from "@/components/ui/Badge";
import {
  getAmenitiesByIds,
  getRoomBySlug,
  getRooms,
  getSiteContact,
} from "@/lib/mock";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const rooms = await getRooms();
  return rooms.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const room = await getRoomBySlug(params.slug);
  if (!room) return { title: "Room not found" };
  return {
    title: room.name,
    description: room.tagline,
  };
}

const categoryLabel = {
  shared_bedroom: "Shared bedroom",
  private_room: "Private room",
  flat: "Flat",
} as const;

export default async function RoomDetailPage({ params }: Props) {
  const [room, contact] = await Promise.all([
    getRoomBySlug(params.slug),
    getSiteContact(),
  ]);
  if (!room) notFound();

  const amenities = await getAmenitiesByIds(room.amenities);

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page pb-16 md:pb-24">
        <nav className="mb-6 text-sm text-ink-muted">
          <Link href="/rooms" className="hover:text-olive">
            Rooms
          </Link>
          <span className="mx-2 text-ink-soft">/</span>
          <span className="text-ink">{room.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
          <div>
            <RoomGallery images={room.images} name={room.name} />

            <div className="mt-8">
              <Badge tone="cream">{categoryLabel[room.category]}</Badge>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                {room.name}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-ink-muted">
                {room.tagline}
              </p>

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-olive/10 py-5 text-sm">
                <div>
                  <dt className="text-ink-soft">Size</dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    {room.sizeSqFt} sq ft
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Capacity</dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
                  </dd>
                </div>
                {room.beds > 0 && (
                  <div>
                    <dt className="text-ink-soft">Beds</dt>
                    <dd className="mt-0.5 font-medium text-ink">{room.beds}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-ink-soft">Bedrooms</dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    {room.bedrooms}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">From</dt>
                  <dd className="mt-0.5 font-mono font-medium text-ink">
                    {formatCurrency(room.priceFrom, room.currency)}/night
                  </dd>
                </div>
              </dl>

              <div className="mt-8 max-w-2xl">
                <h2 className="font-display text-xl font-semibold text-ink">
                  About this unit
                </h2>
                <p className="mt-3 leading-relaxed text-ink-muted">
                  {room.longDescription}
                </p>
                <p className="mt-4 text-sm text-ink-muted">
                  {room.allowsSharedBooking && room.allowsExclusiveBooking
                    ? "Book by the bed, or take the whole room exclusively at a higher nightly rate."
                    : "This unit is booked as a whole."}
                </p>
              </div>

              <div className="mt-10">
                <h2 className="font-display text-xl font-semibold text-ink">
                  Amenities
                </h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {amenities.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-soft bg-white/60 px-3.5 py-2.5 text-sm text-ink"
                    >
                      {a.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10">
                <h2 className="font-display text-xl font-semibold text-ink">
                  House rules
                </h2>
                <ul className="mt-4 space-y-2">
                  {room.houseRules.map((rule) => (
                    <li
                      key={rule}
                      className="border-l-2 border-sage pl-3 text-sm leading-relaxed text-ink-muted"
                    >
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <BookingQuoteCard room={room} contact={contact} />
          </div>
        </div>
      </div>
    </div>
  );
}
