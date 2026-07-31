import {
  listLocalBookings,
} from "@/lib/bookings/local-store";
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
  /** Existing hold to ignore (own checkout hold) */
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

function datesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string,
) {
  return aIn < bOut && aOut > bIn;
}

async function localBedsOccupied(
  roomSlug: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
) {
  let occupied = 0;
  const now = Date.now();
  for (const b of listLocalBookings()) {
    if (b.roomSlug !== roomSlug) continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (
      !["pending_hold", "partially_paid", "paid", "confirmed_no_advance"].includes(
        b.status,
      )
    ) {
      continue;
    }
    if (
      b.status === "pending_hold" &&
      (!b.holdExpiresAt || new Date(b.holdExpiresAt).getTime() <= now)
    ) {
      continue;
    }
    if (datesOverlap(b.checkIn, b.checkOut, checkIn, checkOut)) {
      occupied += b.bedsBooked;
    }
  }
  return occupied;
}

/**
 * Hard availability + fresh quote for one stay line.
 * Prefers Supabase beds_occupied; falls back to local bookings.
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
  // beds_occupied RPC expects uuid — local hex ids must not be sent
  const excludeId =
    line.excludeBookingId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      line.excludeBookingId,
    )
      ? line.excludeBookingId
      : null;

  if (hasSupabase()) {
    try {
      const sb = createServiceSupabase();
      const { data: dbRoom } = await sb
        .from("rooms")
        .select("id")
        .eq("slug", line.roomSlug)
        .maybeSingle();

      if (dbRoom?.id) {
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
        } else {
          bedsOccupied = await localBedsOccupied(
            line.roomSlug,
            line.checkIn,
            line.checkOut,
            line.excludeBookingId,
          );
        }

        // Local-only holds aren't in the RPC — fold them in (excluding our own)
        const localOccupied = await localBedsOccupied(
          line.roomSlug,
          line.checkIn,
          line.checkOut,
          line.excludeBookingId,
        );
        bedsOccupied = Math.max(bedsOccupied, localOccupied);

        if (typeof otaRes.data === "number" && otaRes.data > 0) {
          bedsOccupied = Math.max(bedsOccupied, room.capacity);
        }
      } else {
        bedsOccupied = await localBedsOccupied(
          line.roomSlug,
          line.checkIn,
          line.checkOut,
          line.excludeBookingId,
        );
      }
    } catch {
      bedsOccupied = await localBedsOccupied(
        line.roomSlug,
        line.checkIn,
        line.checkOut,
        line.excludeBookingId,
      );
    }
  } else {
    bedsOccupied = await localBedsOccupied(
      line.roomSlug,
      line.checkIn,
      line.checkOut,
      line.excludeBookingId,
    );
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
