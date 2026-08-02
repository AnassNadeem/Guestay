import { getRoomBySlug } from "@/lib/mock";
import { quoteStay } from "@/lib/pricing";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import type { BookingMode } from "@/types";

export type AvailabilityLine = {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  excludeBookingId?: string;
};

export type AvailabilityResult = {
  ok: boolean;
  roomSlug: string;
  roomName: string;
  available: boolean;
  capacity: number;
  bedsNeeded: number;
  bedsOccupied: number;
  nights: number;
  ratePerNightPkr: number;
  subtotalPkr: number;
  effectivePerNightPkr: number;
  bedsBooked: number;
  reason?: string;
};

/**
 * Hard availability + fresh quote for one stay line (Supabase RPCs only).
 */
export async function checkLineAvailability(
  line: AvailabilityLine,
): Promise<AvailabilityResult> {
  const room = await getRoomBySlug(line.roomSlug);
  if (!room) {
    return {
      ok: false,
      roomSlug: line.roomSlug,
      roomName: line.roomSlug,
      available: false,
      capacity: 0,
      bedsNeeded: 0,
      bedsOccupied: 0,
      nights: 0,
      ratePerNightPkr: 0,
      subtotalPkr: 0,
      effectivePerNightPkr: 0,
      bedsBooked: 0,
      reason: "Room not found",
    };
  }

  let quote;
  try {
    quote = quoteStay({
      room,
      mode: line.mode,
      checkIn: line.checkIn,
      checkOut: line.checkOut,
      guestCount: line.guests,
      isDirect: true,
    });
  } catch (e) {
    return {
      ok: false,
      roomSlug: room.slug,
      roomName: room.name,
      available: false,
      capacity: room.capacity,
      bedsNeeded: 0,
      bedsOccupied: 0,
      nights: 0,
      ratePerNightPkr: 0,
      subtotalPkr: 0,
      effectivePerNightPkr: 0,
      bedsBooked: 0,
      reason: e instanceof Error ? e.message : "Invalid dates",
    };
  }

  const bedsNeeded = quote.bedsBooked;
  let bedsOccupied = 0;

  const excludeId =
    line.excludeBookingId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      line.excludeBookingId,
    )
      ? line.excludeBookingId
      : null;

  if (!hasSupabase()) {
    return {
      ok: false,
      roomSlug: room.slug,
      roomName: room.name,
      available: false,
      capacity: room.capacity,
      bedsNeeded,
      bedsOccupied: 0,
      nights: quote.nights,
      ratePerNightPkr: quote.ratePerNightPkr,
      subtotalPkr: quote.staySubtotalPkr,
      effectivePerNightPkr: quote.effectivePerNightPkr,
      bedsBooked: quote.bedsBooked,
      reason: "Supabase is not configured",
    };
  }

  try {
    const sb = createServiceSupabase();
    const { data: dbRoom } = await sb
      .from("rooms")
      .select("id")
      .eq("slug", line.roomSlug)
      .maybeSingle();

    if (!dbRoom?.id) {
      return {
        ok: false,
        roomSlug: room.slug,
        roomName: room.name,
        available: false,
        capacity: room.capacity,
        bedsNeeded,
        bedsOccupied: 0,
        nights: quote.nights,
        ratePerNightPkr: quote.ratePerNightPkr,
        subtotalPkr: quote.staySubtotalPkr,
        effectivePerNightPkr: quote.effectivePerNightPkr,
        bedsBooked: quote.bedsBooked,
        reason: `Room "${line.roomSlug}" is not in the database`,
      };
    }

    const [bedsRes, otaRes] = await Promise.all([
      sb.rpc("beds_occupied", {
        p_room_id: dbRoom.id,
        p_check_in: line.checkIn,
        p_check_out: line.checkOut,
        p_exclude_booking: excludeId,
      }),
      sb.rpc("ota_beds_blocked", {
        p_room_id: dbRoom.id,
        p_check_in: line.checkIn,
        p_check_out: line.checkOut,
      }),
    ]);

    if (!bedsRes.error && typeof bedsRes.data === "number") {
      bedsOccupied = bedsRes.data;
    } else if (bedsRes.error) {
      console.error("[availability] beds_occupied", bedsRes.error.message);
    }

    if (typeof otaRes.data === "number" && otaRes.data > 0) {
      bedsOccupied = Math.max(bedsOccupied, room.capacity);
    }
  } catch (e) {
    console.error("[availability]", e);
    return {
      ok: false,
      roomSlug: room.slug,
      roomName: room.name,
      available: false,
      capacity: room.capacity,
      bedsNeeded,
      bedsOccupied: 0,
      nights: quote.nights,
      ratePerNightPkr: quote.ratePerNightPkr,
      subtotalPkr: quote.staySubtotalPkr,
      effectivePerNightPkr: quote.effectivePerNightPkr,
      bedsBooked: quote.bedsBooked,
      reason: "Could not check availability",
    };
  }

  const available = bedsOccupied + bedsNeeded <= room.capacity;

  return {
    ok: available,
    roomSlug: room.slug,
    roomName: room.name,
    available,
    capacity: room.capacity,
    bedsNeeded,
    bedsOccupied,
    nights: quote.nights,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    effectivePerNightPkr: quote.effectivePerNightPkr,
    bedsBooked: quote.bedsBooked,
    reason: available
      ? undefined
      : `${room.name} is no longer available for these dates`,
  };
}

export async function checkLinesAvailability(lines: AvailabilityLine[]) {
  const results = [];
  for (const line of lines) {
    results.push(await checkLineAvailability(line));
  }
  return {
    ok: results.every((r) => r.available),
    results,
  };
}
