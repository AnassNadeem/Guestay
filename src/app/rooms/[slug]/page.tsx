import { BookingCard } from "@/components/rooms/BookingCard";
import { RoomGallery } from "@/components/rooms/RoomGallery";
import { Badge } from "@/components/ui/Badge";
import { getAmenitiesByIds, getRoomBySlug, getRooms } from "@/lib/mock";
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

const availabilityTone = {
  available: "available" as const,
  limited: "limited" as const,
  waitlist: "waitlist" as const,
  booked: "booked" as const,
};

export default async function RoomDetailPage({ params }: Props) {
  const room = await getRoomBySlug(params.slug);
  if (!room) notFound();

  const amenities = await getAmenitiesByIds(room.amenities);

  return (
    <div className="bg-white pt-24 md:pt-28">
      <div className="container-page pb-16 md:pb-24">
        <nav className="mb-6 text-sm text-ink-soft">
          <Link href="/rooms" className="hover:text-olive">
            Rooms
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-muted">{room.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
          <div>
            <RoomGallery images={room.images} name={room.name} />

            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cream" className="capitalize">
                  {room.type}
                </Badge>
                <Badge tone={availabilityTone[room.availability]}>
                  {room.availability}
                </Badge>
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-olive md:text-4xl">
                {room.name}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-ink-muted">
                {room.tagline}
              </p>

              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-olive/8 py-5 text-sm">
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
                <div>
                  <dt className="text-ink-soft">Beds</dt>
                  <dd className="mt-0.5 font-medium text-ink">{room.beds}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Floor</dt>
                  <dd className="mt-0.5 font-medium text-ink">{room.floor}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Deposit</dt>
                  <dd className="mt-0.5 font-mono font-medium text-ink">
                    {formatCurrency(room.securityDeposit)}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 max-w-2xl">
                <h2 className="font-display text-xl font-semibold text-ink">
                  About this room
                </h2>
                <p className="mt-3 leading-relaxed text-ink-muted">
                  {room.longDescription}
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
                      className="rounded-soft bg-cream-50 px-3.5 py-2.5 text-sm text-ink"
                    >
                      {a.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <BookingCard room={room} />
          </div>
        </div>
      </div>
    </div>
  );
}
