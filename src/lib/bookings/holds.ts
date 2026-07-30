import {
  createLocalHold,
  extendLocalHold,
  getLocalBooking,
  updateLocalBooking,
  type LocalBooking,
} from "@/lib/bookings/local-store";
import { quoteStay } from "@/lib/pricing";
import { getRoomBySlug } from "@/lib/mock";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import type { BookingMode } from "@/types";

function holdMinutes() {
  return Number(
    process.env.BOOKING_HOLD_MINUTES ||
      (process.env.BOOKING_HOLD_HOURS
        ? Number(process.env.BOOKING_HOLD_HOURS) * 60
        : 15),
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
 * Create a per-room 15-minute hold. Prefers Supabase; falls back to local-store.
 * Called on Add / Book Now — not only at checkout confirm.
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
}): Promise<HoldResult> {
  const room = await getRoomBySlug(input.roomSlug);
  if (!room) throw new Error("Room not found");

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
  const holdExpiresAt = quote.isGroupNoAdvance
    ? null
    : new Date(Date.now() + mins * 60 * 1000).toISOString();

  const guestName = input.guestName || "Guest";
  const guestEmail = input.guestEmail || "hold@guestay.pk";
  const guestPhone = input.guestPhone || "";

  if (hasSupabase()) {
    try {
      const sb = createServiceSupabase();
      const { data: dbRoom } = await sb
        .from("rooms")
        .select("id, name")
        .eq("slug", input.roomSlug)
        .maybeSingle();

      if (dbRoom?.id) {
        const reference = `GST-${Date.now().toString(36).toUpperCase()}`;
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
            status: quote.isGroupNoAdvance
              ? "confirmed_no_advance"
              : "pending_hold",
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

        if (!error && data) {
          // Mirror into local cache for optimistic UI / cron fallback
          try {
            const local = await createLocalHold({
              roomSlug: input.roomSlug,
              mode: input.mode,
              checkIn: input.checkIn,
              checkOut: input.checkOut,
              guests: input.guests,
              guestName,
              guestEmail,
              guestPhone,
            });
            updateLocalBooking(local.booking.id, {
              id: data.id,
              reference: data.reference,
              holdExpiresAt: data.hold_expires_at,
              notes: `cart:${input.cartItemId}`,
            });
          } catch {
            /* local mirror optional */
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
      }
    } catch {
      /* fall through to local */
    }
  }

  const { booking } = await createLocalHold({
    roomSlug: input.roomSlug,
    mode: input.mode,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    guestName,
    guestEmail,
    guestPhone,
  });
  updateLocalBooking(booking.id, {
    notes: `cart:${input.cartItemId}`,
  });

  return {
    bookingId: booking.id,
    reference: booking.reference,
    holdExpiresAt: booking.holdExpiresAt,
    nights: quote.nights,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    effectivePerNightPkr: quote.effectivePerNightPkr,
    bedsBooked: quote.bedsBooked,
    roomName: room.name,
    status: booking.status,
  };
}

export async function extendRoomHold(
  bookingId: string,
  minutes = holdMinutes(),
): Promise<{ holdExpiresAt: string } | null> {
  if (hasSupabase()) {
    try {
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
      if (!error && data?.hold_expires_at) {
        extendLocalHold(bookingId, minutes);
        return { holdExpiresAt: data.hold_expires_at };
      }
    } catch {
      /* fall through */
    }
  }
  const updated = extendLocalHold(bookingId, minutes);
  if (!updated?.holdExpiresAt) return null;
  return { holdExpiresAt: updated.holdExpiresAt };
}

export async function updateRoomHoldDates(input: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}): Promise<HoldResult> {
  const local = getLocalBooking(input.bookingId);
  let roomSlug = local?.roomSlug;
  let mode = local?.bookingMode;
  let guests = input.guests ?? local?.guestCount ?? 1;

  if (hasSupabase()) {
    try {
      const sb = createServiceSupabase();
      const { data: row } = await sb
        .from("bookings")
        .select("id, room_id, booking_mode, guest_count, cart_item_id, rooms(slug, name)")
        .eq("id", input.bookingId)
        .maybeSingle();

      if (row) {
        const roomsJoin = row.rooms as
          | { slug: string; name: string }
          | { slug: string; name: string }[]
          | null;
        const roomRow = Array.isArray(roomsJoin) ? roomsJoin[0] : roomsJoin;
        roomSlug = roomRow?.slug || roomSlug;
        mode = (row.booking_mode as BookingMode) || mode;
        guests = input.guests ?? row.guest_count ?? guests;

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
            hold_expires_at: nextHold,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.bookingId)
          .eq("status", "pending_hold")
          .select("id, reference, hold_expires_at, status")
          .single();

        if (error) throw error;

        if (local) {
          updateLocalBooking(local.id, {
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            nights: quote.nights,
            ratePerNightPkr: quote.ratePerNightPkr,
            subtotalPkr: quote.staySubtotalPkr,
            totalPkr: quote.staySubtotalPkr + quote.depositDuePkr,
            bedsBooked: quote.bedsBooked,
            holdExpiresAt: nextHold,
          });
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
          roomName: roomRow?.name || room.name,
          status: data.status,
        };
      }
    } catch (e) {
      if (!local) throw e;
    }
  }

  if (!local || !roomSlug || !mode) throw new Error("Hold not found");
  const room = await getRoomBySlug(roomSlug);
  if (!room) throw new Error("Room not found");

  const quote = quoteStay({
    room,
    mode,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: guests,
    isDirect: true,
  });

  const nextHold = new Date(
    Date.now() + holdMinutes() * 60 * 1000,
  ).toISOString();

  const updated = updateLocalBooking(local.id, {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: quote.nights,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    totalPkr: quote.staySubtotalPkr + quote.depositDuePkr,
    bedsBooked: quote.bedsBooked,
    holdExpiresAt: nextHold,
    tierApplied: quote.tier,
  }) as LocalBooking;

  return {
    bookingId: updated.id,
    reference: updated.reference,
    holdExpiresAt: updated.holdExpiresAt,
    nights: quote.nights,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    effectivePerNightPkr: quote.effectivePerNightPkr,
    bedsBooked: quote.bedsBooked,
    roomName: room.name,
    status: updated.status,
  };
}

export async function releaseRoomHold(bookingId: string) {
  if (hasSupabase()) {
    try {
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
    } catch {
      /* ignore */
    }
  }
  const local = getLocalBooking(bookingId);
  if (local) {
    updateLocalBooking(local.id, {
      status: "expired_hold",
      holdExpiresAt: null,
    });
  }
}
