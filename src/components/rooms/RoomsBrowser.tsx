import { RoomCard } from "@/components/rooms/RoomCard";
import type { Room } from "@/types";

export function RoomsBrowser({ rooms }: { rooms: Room[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room, i) => (
        <RoomCard key={room.id} room={room} index={i} />
      ))}
    </div>
  );
}
