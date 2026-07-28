import { rooms } from "@/lib/mock/rooms";
import type { Room } from "@/types";

/** Client-safe room list (same mock data; no server-only APIs). */
export async function getRoomsSync(): Promise<Room[]> {
  return rooms;
}
