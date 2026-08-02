import { checkLineAvailability } from "@/lib/bookings/availability";
import { extendLocalHold } from "@/lib/bookings/local-store";
import { quoteStay } from "@/lib/pricing";
import { getRoomBySlug } from "@/lib/mock";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import type { BookingMode } from "@/types";

function holdMinutes() {
  return Number(
    process.env.BOOKING_HOLD_MINUTES ||
      (process.env.BOOKING_HOLD_HOURS
        ? Number(process.env.BOOKING_HOLD_HOURS) * 60
        : 10),
  );
}

export type HoldResult = {
  bookingId: string;
  reference: string;
  holdExpiresAt: string | null;
  nights: number;
  ratePerNightPkr: number;
  subtotalPkr: number;
  effectivePerNightPkr: number;
  bedsBooked: number;
  roomName: string;
  status: string;
};

/**
 * Create a short inventory hold in Supabase. Fails if DB/room unavailable.
 */
export async function createRoomHold(input: {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  cartItemId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  skipAvailabilityCheck?: boolean;
}): Promise<HoldResult> {
  if (!hasSupabase()) {
    throw new Error("Supabase is not configured — cannot create holds");
  }

  const room = await getRoomBySlug(input.roomSlug);
  if (!room) throw new Error("Room not found");

  if (!input.skipAvailabilityCheck) {
    const availability = await checkLineAvailability({
      roomSlug: input.roomSlug,
      mode: input.mode,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
    });
    if (!availability.available) {
      throw new Error(
        availability.reason || "Room is no longer available for these dates",
      );
    }
  }

  const quote = quoteStay({
    room,
    mode: input.mode,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guests,
    isDirect: true,
    depositDiscountRate: Number(
      process.env.DIRECT_BOOKING_DEPOSIT_DISCOUNT || 0.1,
    ),
    groupNoAdvanceMinGuests: Number(
      process.env.GROUP_NO_ADVANCE_MIN_GUESTS || 10,
    ),
  });

  const mins = holdMinutes();
  const holdExpiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
  const guestName = input.guestName || "Guest";
  const guestEmail = input.guestEmail || "hold@guestay.pk";
  const guestPhone = input.guestPhone || "";

  const sb = createServiceSupabase();
  const { data: dbRoom, error: roomErr } = await sb
    .from("rooms")
    .select("id, name")
    .eq("slug", input.roomSlug)
    .maybeSingle();

  if (roomErr || !dbRoom?.id) {
    throw new Error(
      roomErr?.message ||
        `Room "${input.roomSlug}" is not in the database — seed or create via admin`,
    );
  }

  const { generateHoldReference } = await import("@/lib/bookings/reference");
  const reference = generateHoldReference();
  const { data, error } = await sb
    .from("bookings")
    .insert({
      reference,
      room_id: dbRoom.id,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone || "pending",
      guest_count: input.guests,
      booking_mode: input.mode,
      beds_booked: quote.bedsBooked,
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights: quote.nights,
      status: "pending_hold",
      source: "direct",
      tier_applied: quote.tier,
      rate_per_night_pkr: quote.ratePerNightPkr,
      subtotal_pkr: quote.staySubtotalPkr,
      deposit_list_pkr: quote.depositListPkr,
      deposit_discount_pkr: quote.depositDiscountPkr,
      deposit_due_pkr: quote.depositDuePkr,
      amount_paid_pkr: 0,
      amount_due_pkr: quote.staySubtotalPkr,
      total_pkr: quote.staySubtotalPkr + quote.depositDuePkr,
      hold_expires_at: holdExpiresAt,
      is_group_no_advance: quote.isGroupNoAdvance,
      cart_item_id: input.cartItemId,
    })
    .select("id, reference, hold_expires_at, status")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create hold");
  }

  return {
    bookingId: data.id,
    reference: data.reference,
    holdExpiresAt: data.hold_expires_at,
    nights: quote.nights,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    effectivePerNightPkr: quote.effectivePerNightPkr,
    bedsBooked: quote.bedsBooked,
    roomName: dbRoom.name || room.name,
    status: data.status,
  };
}

export async function extendRoomHold(
  bookingId: string,
  minutes = holdMinutes(),
): Promise<{ holdExpiresAt: string } | null> {
  if (!hasSupabase()) return null;
  const sb = createServiceSupabase();
  const next = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("bookings")
    .update({
      hold_expires_at: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending_hold")
    .select("hold_expires_at")
    .maybeSingle();
  if (error || !data?.hold_expires_at) {
    const updated = await extendLocalHold(bookingId, minutes);
    if (!updated?.holdExpiresAt) return null;
    return { holdExpiresAt: updated.holdExpiresAt };
  }
  return { holdExpiresAt: data.hold_expires_at };
}

export async function updateRoomHoldDates(input: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}): Promise<HoldResult> {
  if (!hasSupabase()) throw new Error("Supabase is not configured");

  const sb = createServiceSupabase();
  const { data: row } = await sb
    .from("bookings")
    .select("id, room_id, booking_mode, guest_count, rooms(slug, name)")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (!row) throw new Error("Hold not found");

  const roomsJoin = row.rooms as
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
  const roomRow = Array.isArray(roomsJoin) ? roomsJoin[0] : roomsJoin;
  const roomSlug = roomRow?.slug;
  const mode = row.booking_mode as BookingMode;
  const guests = input.guests ?? row.guest_count ?? 1;

  if (!roomSlug || !mode) throw new Error("Hold not found");

  const room = await getRoomBySlug(roomSlug);
  if (!room) throw new Error("Room not found");

  const quote = quoteStay({
    room,
    mode,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: guests,
    isDirect: true,
    depositDiscountRate: Number(
      process.env.DIRECT_BOOKING_DEPOSIT_DISCOUNT || 0.1,
    ),
  });

  const nextHold = new Date(
    Date.now() + holdMinutes() * 60 * 1000,
  ).toISOString();

  const { data, error } = await sb
    .from("bookings")
    .update({
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights: quote.nights,
      tier_applied: quote.tier,
      rate_per_night_pkr: quote.ratePerNightPkr,
      subtotal_pkr: quote.staySubtotalPkr,
      deposit_due_pkr: quote.depositDuePkr,
      amount_due_pkr: quote.staySubtotalPkr,
      beds_booked: quote.bedsBooked,
      guest_count: guests,
      hold_expires_at: nextHold,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId)
    .eq("status", "pending_hold")
    .select("id, reference, hold_expires_at, status")
    .single();

  if (error || !data) throw new Error(error?.message || "Failed to update hold");

  return {
    bookingId: data.id,
    reference: data.reference,
    holdExpiresAt: data.hold_expires_at,
    nights: quote.nights,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    effectivePerNightPkr: quote.effectivePerNightPkr,
    bedsBooked: quote.bedsBooked,
    roomName: roomRow?.name || room.name,
    status: data.status,
  };
}

export async function releaseRoomHold(bookingId: string) {
  if (!hasSupabase()) return;
  const sb = createServiceSupabase();
  await sb
    .from("bookings")
    .update({
      status: "expired_hold",
      hold_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("status", "pending_hold");
}

export async function releaseHoldsByCartItemId(cartItemId: string) {
  if (!cartItemId || !hasSupabase()) return;
  const sb = createServiceSupabase();
  await sb
    .from("bookings")
    .update({
      status: "expired_hold",
      hold_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("cart_item_id", cartItemId)
    .eq("status", "pending_hold");
}

export async function releaseAbandonedCheckoutHolds(input: {
  roomSlug: string;
  checkIn: string;
  checkOut: string;
}) {
  if (!hasSupabase()) return;
  const placeholderEmail = "hold@guestay.pk";
  const sb = createServiceSupabase();
  const { data: dbRoom } = await sb
    .from("rooms")
    .select("id")
    .eq("slug", input.roomSlug)
    .maybeSingle();

  if (!dbRoom?.id) return;

  const { data: rows } = await sb
    .from("bookings")
    .select("id")
    .eq("room_id", dbRoom.id)
    .eq("status", "pending_hold")
    .eq("guest_email", placeholderEmail)
    .lt("check_in", input.checkOut)
    .gt("check_out", input.checkIn);

  const ids = (rows || []).map((r) => r.id as string).filter(Boolean);
  if (ids.length > 0) {
    await sb
      .from("bookings")
      .update({
        status: "expired_hold",
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);
  }
}
