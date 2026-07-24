import { RoomCard } from "@/components/rooms/RoomCard";
import { Section } from "@/components/ui/Section";
import type { Room } from "@/types";
import Link from "next/link";

export function FeaturedRooms({ rooms }: { rooms: Room[] }) {
  const [lead, ...rest] = rooms;

  if (!lead) return null;

  return (
    <Section
      eyebrow="Rooms"
      title="Four ways to settle in"
      description="From a quiet private nook to a full suite — pick the room that matches how you want to live."
      actions={
        <Link
          href="/rooms"
          className="text-sm font-medium text-olive underline-offset-4 hover:underline"
        >
          View all rooms
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RoomCard room={lead} index={0} featured />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {rest.map((room, i) => (
            <RoomCard key={room.id} room={room} index={i + 1} />
          ))}
        </div>
      </div>
    </Section>
  );
}
