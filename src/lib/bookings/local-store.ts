/**
 * Booking store — Supabase is the sole source of truth.
 * LocalBooking remains the camelCase DTO used across the app.
 */
import { quoteStay } from "@/lib/pricing";
import { getRoomBySlug } from "@/lib/mock";
import { bookingWriteErrorMessage } from "@/lib/bookings/inventory-errors";
import {
  generateBookingReference,
  generateHoldReference,
} from "@/lib/bookings/reference";
import type { AccountLinkScenario } from "@/lib/mail/booking";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import type { BookingMode, BookingStatus } from "@/types";

export type LocalBooking = {
  id: string;
  reference: string;
  orderReference?: string;
  orderId?: string;
  roomSlug: string;
  roomName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  bookingMode: BookingMode;
  bedsBooked: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: BookingStatus;
  source: "direct" | "walk_in" | "airbnb" | "booking_com";
  tierApplied: number;
  ratePerNightPkr: number;
  subtotalPkr: number;
  depositDuePkr: number;
  amountPaidPkr: number;
  amountDuePkr: number;
  totalPkr: number;
  holdExpiresAt: string | null;
  isGroupNoAdvance: boolean;
  paymentKind?: "full" | "half" | "none";
  gatewayTracker?: string;
  guestId?: string;
  pendingSessionUserId?: string;
  accountLinkScenario?: AccountLinkScenario;
  confirmationNotifiedAt?: string;
  /** When money was collected (payments.paid_at), if any. */
  paidAt?: string;
  createdAt: string;
  notes?: string;
  cartItemId?: string;
};

type BookingMeta = {
  paymentKind?: "full" | "half" | "none";
  pendingSessionUserId?: string;
  accountLinkScenario?: AccountLinkScenario;
  confirmationNotifiedAt?: string;
};

type DbBookingRow = {
  id: string;
  reference: string;
  room_id: string;
  guest_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_count: number;
  booking_mode: BookingMode;
  beds_booked: number;
  check_in: string;
  check_out: string;
  nights: number;
  source: LocalBooking["source"];
  status: BookingStatus;
  tier_applied: number;
  rate_per_night_pkr: number;
  subtotal_pkr: number;
  deposit_due_pkr: number;
  amount_paid_pkr: number;
  amount_due_pkr: number;
  total_pkr: number;
  hold_expires_at: string | null;
  is_group_no_advance: boolean;
  notes: string | null;
  gateway_tracker: string | null;
  order_id: string | null;
  cart_item_id: string | null;
  created_at: string;
  rooms?:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
};

function requireSupabase() {
  if (!hasSupabase()) {
    throw new Error("Supabase is not configured — bookings require a database");
  }
  return createServiceSupabase();
}

function parseMeta(notes: string | null | undefined): BookingMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as BookingMeta & { v?: number };
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* plain notes */
  }
  return {};
}

function serializeMeta(
  existingNotes: string | null | undefined,
  patch: BookingMeta,
): string {
  const base = parseMeta(existingNotes);
  return JSON.stringify({ ...base, ...patch, v: 1 });
}

function roomFromJoin(
  rooms:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null
    | undefined,
) {
  if (!rooms) return { slug: "unknown", name: "Room" };
  return Array.isArray(rooms) ? rooms[0] || { slug: "unknown", name: "Room" } : rooms;
}

function rowToLocal(row: DbBookingRow): LocalBooking {
  const room = roomFromJoin(row.rooms);
  const meta = parseMeta(row.notes);
  return {
    id: row.id,
    reference: row.reference,
    orderReference: row.reference,
    orderId: row.order_id || undefined,
    roomSlug: room.slug,
    roomName: room.name,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    guestCount: row.guest_count,
    bookingMode: row.booking_mode,
    bedsBooked: row.beds_booked,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    status: row.status,
    source: row.source,
    tierApplied: row.tier_applied,
    ratePerNightPkr: row.rate_per_night_pkr,
    subtotalPkr: row.subtotal_pkr,
    depositDuePkr: row.deposit_due_pkr,
    amountPaidPkr: row.amount_paid_pkr,
    amountDuePkr: row.amount_due_pkr,
    totalPkr: row.total_pkr,
    holdExpiresAt: row.hold_expires_at,
    isGroupNoAdvance: row.is_group_no_advance,
    paymentKind: meta.paymentKind,
    gatewayTracker: row.gateway_tracker || undefined,
    guestId: row.guest_id || undefined,
    pendingSessionUserId: meta.pendingSessionUserId,
    accountLinkScenario: meta.accountLinkScenario,
    confirmationNotifiedAt: meta.confirmationNotifiedAt,
    createdAt: row.created_at,
    notes: row.notes || undefined,
    cartItemId: row.cart_item_id || undefined,
  };
}

const SELECT =
  "id, reference, room_id, guest_id, guest_name, guest_email, guest_phone, guest_count, booking_mode, beds_booked, check_in, check_out, nights, source, status, tier_applied, rate_per_night_pkr, subtotal_pkr, deposit_due_pkr, amount_paid_pkr, amount_due_pkr, total_pkr, hold_expires_at, is_group_no_advance, notes, gateway_tracker, order_id, cart_item_id, created_at, rooms(slug, name)";

export async function listLocalBookings(): Promise<LocalBooking[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("bookings")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => rowToLocal(r as DbBookingRow));
}

export async function getLocalBooking(
  idOrRef: string,
): Promise<LocalBooking | null> {
  const sb = requireSupabase();
  const { data: byId } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("id", idOrRef)
    .maybeSingle();
  if (byId) return rowToLocal(byId as DbBookingRow);

  const { data: byRef } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("reference", idOrRef)
    .maybeSingle();
  if (byRef) return rowToLocal(byRef as DbBookingRow);
  return null;
}

export async function getLocalBookingByTracker(
  tracker: string,
): Promise<LocalBooking | null> {
  const sb = requireSupabase();
  const { data } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("gateway_tracker", tracker)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data) return rowToLocal(data as DbBookingRow);

  const { data: pay } = await sb
    .from("payments")
    .select("booking_id")
    .eq("gateway_tracker", tracker)
    .limit(1)
    .maybeSingle();
  if (pay?.booking_id) return getLocalBooking(pay.booking_id as string);
  return null;
}

export async function listBookingsByOrderId(
  orderId: string,
): Promise<LocalBooking[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("bookings")
    .select(SELECT)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => rowToLocal(r as DbBookingRow));
}

export async function listBookingsByGuest(opts: {
  guestId?: string | null;
  email?: string | null;
}): Promise<LocalBooking[]> {
  const sb = requireSupabase();
  let q = sb.from("bookings").select(SELECT).order("created_at", {
    ascending: false,
  });
  if (opts.guestId) {
    q = q.eq("guest_id", opts.guestId);
  } else if (opts.email) {
    q = q.ilike("guest_email", opts.email.trim());
  } else {
    return [];
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return attachPaidAt((data || []).map((r) => rowToLocal(r as DbBookingRow)));
}

export async function createLocalHold(input: {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  cartItemId?: string;
}) {
  const room = await getRoomBySlug(input.roomSlug);
  if (!room) throw new Error("Room not found");

  const quote = quoteStay({
    room,
    mode: input.mode,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guests,
    isDirect: true,
  });

  const holdMinutes = Number(
    process.env.BOOKING_HOLD_MINUTES ||
      (process.env.BOOKING_HOLD_HOURS
        ? Number(process.env.BOOKING_HOLD_HOURS) * 60
        : 10),
  );
  const holdExpiresAt = new Date(
    Date.now() + holdMinutes * 60 * 1000,
  ).toISOString();

  const sb = requireSupabase();
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

  const reference = generateHoldReference();
  const { data, error } = await sb
    .from("bookings")
    .insert({
      reference,
      room_id: dbRoom.id,
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone || "pending",
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
      cart_item_id: input.cartItemId || null,
    })
    .select(SELECT)
    .single();

  if (error || !data) {
    throw new Error(
      bookingWriteErrorMessage(error, "Failed to create hold"),
    );
  }

  return { booking: rowToLocal(data as DbBookingRow), quote };
}

export async function updateLocalBooking(
  id: string,
  patch: Partial<LocalBooking>,
): Promise<LocalBooking | null> {
  const sb = requireSupabase();
  const existing = await getLocalBooking(id);
  if (!existing) return null;

  const metaPatch: BookingMeta = {};
  if (patch.paymentKind !== undefined) metaPatch.paymentKind = patch.paymentKind;
  if (patch.pendingSessionUserId !== undefined) {
    metaPatch.pendingSessionUserId = patch.pendingSessionUserId;
  }
  if (patch.accountLinkScenario !== undefined) {
    metaPatch.accountLinkScenario = patch.accountLinkScenario;
  }
  if (patch.confirmationNotifiedAt !== undefined) {
    metaPatch.confirmationNotifiedAt = patch.confirmationNotifiedAt;
  }

  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.reference !== undefined) row.reference = patch.reference;
  if (patch.guestName !== undefined) row.guest_name = patch.guestName;
  if (patch.guestEmail !== undefined) row.guest_email = patch.guestEmail;
  if (patch.guestPhone !== undefined) row.guest_phone = patch.guestPhone;
  if (patch.guestCount !== undefined) row.guest_count = patch.guestCount;
  if (patch.bookingMode !== undefined) row.booking_mode = patch.bookingMode;
  if (patch.bedsBooked !== undefined) row.beds_booked = patch.bedsBooked;
  if (patch.checkIn !== undefined) row.check_in = patch.checkIn;
  if (patch.checkOut !== undefined) row.check_out = patch.checkOut;
  if (patch.nights !== undefined) row.nights = patch.nights;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.tierApplied !== undefined) row.tier_applied = patch.tierApplied;
  if (patch.ratePerNightPkr !== undefined) {
    row.rate_per_night_pkr = patch.ratePerNightPkr;
  }
  if (patch.subtotalPkr !== undefined) row.subtotal_pkr = patch.subtotalPkr;
  if (patch.depositDuePkr !== undefined) row.deposit_due_pkr = patch.depositDuePkr;
  if (patch.amountPaidPkr !== undefined) row.amount_paid_pkr = patch.amountPaidPkr;
  if (patch.amountDuePkr !== undefined) row.amount_due_pkr = patch.amountDuePkr;
  if (patch.totalPkr !== undefined) row.total_pkr = patch.totalPkr;
  if (patch.holdExpiresAt !== undefined) {
    row.hold_expires_at = patch.holdExpiresAt;
  }
  if (patch.isGroupNoAdvance !== undefined) {
    row.is_group_no_advance = patch.isGroupNoAdvance;
  }
  if (patch.gatewayTracker !== undefined) {
    row.gateway_tracker = patch.gatewayTracker;
  }
  if (patch.guestId !== undefined) row.guest_id = patch.guestId;
  if (patch.orderId !== undefined) row.order_id = patch.orderId;
  if (patch.cartItemId !== undefined) row.cart_item_id = patch.cartItemId;

  if (Object.keys(metaPatch).length > 0 || patch.notes !== undefined) {
    if (patch.notes !== undefined && !patch.notes.startsWith("{")) {
      // Preserve structured meta when replacing with plain notes string
      row.notes = serializeMeta(
        serializeMeta(existing.notes, metaPatch),
        parseMeta(existing.notes),
      );
      // Prefer explicit plain notes only when no meta being written
      if (Object.keys(metaPatch).length === 0) {
        row.notes = patch.notes;
      } else {
        const meta = {
          ...parseMeta(existing.notes),
          ...metaPatch,
          plain: patch.notes,
        };
        row.notes = JSON.stringify({ ...meta, v: 1 });
      }
    } else if (patch.notes !== undefined && patch.notes.startsWith("{")) {
      row.notes = serializeMeta(patch.notes, metaPatch);
    } else {
      row.notes = serializeMeta(existing.notes, metaPatch);
    }
  }

  const { data, error } = await sb
    .from("bookings")
    .update(row)
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error || !data) {
    console.error("[updateLocalBooking]", error?.message);
    return null;
  }
  return rowToLocal(data as DbBookingRow);
}

export async function expireLocalHolds(_now = Date.now()) {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("expire_pending_holds");
  if (error) {
    const { data: rows } = await sb
      .from("bookings")
      .update({
        status: "expired_hold",
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "pending_hold")
      .lt("hold_expires_at", new Date().toISOString())
      .select("id");
    return rows?.length ?? 0;
  }
  return typeof data === "number" ? data : 0;
}

export async function extendLocalHold(idOrRef: string, minutes?: number) {
  const booking = await getLocalBooking(idOrRef);
  if (!booking || booking.status !== "pending_hold") return null;
  const mins = minutes ?? Number(process.env.BOOKING_HOLD_MINUTES || 10);
  const base = Math.max(
    Date.now(),
    booking.holdExpiresAt
      ? new Date(booking.holdExpiresAt).getTime()
      : Date.now(),
  );
  return updateLocalBooking(booking.id, {
    holdExpiresAt: new Date(base + mins * 60 * 1000).toISOString(),
  });
}

export type LocalOrderLine = {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export async function createLocalMultiHold(input: {
  lines: LocalOrderLine[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  preferredPaymentMethod?: string;
}) {
  const sb = requireSupabase();
  const results = [];
  for (const line of input.lines) {
    const r = await createLocalHold({
      ...line,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
    });
    results.push(r);
  }

  const totalGuests = input.lines.reduce((s, l) => s + l.guests, 0);
  const isGroup =
    totalGuests >= Number(process.env.GROUP_NO_ADVANCE_MIN_GUESTS || 10);
  const holdExpiresAt = results[0]?.booking.holdExpiresAt ?? null;
  const holdOrderKey = generateHoldReference();
  const totalPkr = results.reduce((s, r) => s + r.quote.staySubtotalPkr, 0);

  const { data: order, error: orderErr } = await sb
    .from("booking_orders")
    .insert({
      reference: holdOrderKey,
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone,
      guest_count_total: totalGuests,
      status: "pending_hold",
      preferred_payment_method: input.preferredPaymentMethod || null,
      payment_choice: "full",
      subtotal_pkr: totalPkr,
      total_pkr: totalPkr,
      amount_due_pkr: totalPkr,
      hold_expires_at: holdExpiresAt,
      is_group_no_advance: isGroup,
    })
    .select("id, reference")
    .single();

  if (orderErr || !order) {
    throw new Error(orderErr?.message || "Failed to create booking order");
  }

  const bookings: LocalBooking[] = [];
  for (const r of results) {
    const updated = await updateLocalBooking(r.booking.id, {
      orderId: order.id as string,
      isGroupNoAdvance: isGroup || r.booking.isGroupNoAdvance,
    });
    bookings.push(updated || r.booking);
  }

  return {
    orderId: order.id as string,
    reference: order.reference as string,
    holdExpiresAt,
    isGroupNoAdvance: isGroup,
    bookings,
    quotes: results.map((r) => r.quote),
    totalPkr,
    halfPaymentPkr: Math.ceil(totalPkr / 2),
    fullPaymentPkr: totalPkr,
  };
}

export async function createWalkInBooking(input: {
  roomSlug: string;
  roomName: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  amountCollectedPkr: number;
  notes?: string;
}) {
  const nights = Math.max(
    1,
    Math.round(
      (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) /
        86400000,
    ),
  );
  const reference = generateBookingReference();
  const sb = requireSupabase();
  const { data: dbRoom } = await sb
    .from("rooms")
    .select("id, name")
    .eq("slug", input.roomSlug)
    .maybeSingle();
  if (!dbRoom?.id) throw new Error("Room not found in database");

  const { data, error } = await sb
    .from("bookings")
    .insert({
      reference,
      room_id: dbRoom.id,
      guest_name: input.guestName,
      guest_email: input.guestEmail || "walkin@guestay.pk",
      guest_phone: input.guestPhone,
      guest_count: input.guests,
      booking_mode: input.mode,
      beds_booked: input.guests,
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights,
      status: "paid",
      source: "walk_in",
      tier_applied: 1,
      rate_per_night_pkr: Math.round(input.amountCollectedPkr / nights) || 0,
      subtotal_pkr: input.amountCollectedPkr,
      deposit_due_pkr: 0,
      amount_paid_pkr: input.amountCollectedPkr,
      amount_due_pkr: 0,
      total_pkr: input.amountCollectedPkr,
      hold_expires_at: null,
      is_group_no_advance: false,
      notes: JSON.stringify({
        v: 1,
        paymentKind: "full",
        plain: input.notes || undefined,
      }),
    })
    .select(SELECT)
    .single();

  if (error || !data) {
    throw new Error(bookingWriteErrorMessage(error, "Walk-in failed"));
  }
  const booking = rowToLocal(data as DbBookingRow);

  if (input.amountCollectedPkr > 0) {
    const paidAt = new Date().toISOString();
    const { error: payErr } = await sb.from("payments").insert({
      booking_id: booking.id,
      kind: "full",
      amount_pkr: input.amountCollectedPkr,
      status: "succeeded",
      gateway: "walk_in",
      preferred_method: "cash",
      paid_at: paidAt,
    });
    if (payErr) {
      console.error("[createWalkInBooking] payment row", payErr.message);
    } else {
      booking.paidAt = paidAt;
    }
  }

  return booking;
}

/** Attach payments.paid_at onto booking DTOs (latest succeeded payment wins). */
export async function attachPaidAt(
  bookings: LocalBooking[],
): Promise<LocalBooking[]> {
  if (bookings.length === 0) return bookings;
  const sb = requireSupabase();
  const ids = bookings.map((b) => b.id);
  const { data, error } = await sb
    .from("payments")
    .select("booking_id, paid_at, created_at, status")
    .in("booking_id", ids)
    .eq("status", "succeeded")
    .order("paid_at", { ascending: false });
  if (error) {
    console.error("[attachPaidAt]", error.message);
    return bookings;
  }
  const byBooking = new Map<string, string>();
  for (const row of data || []) {
    const bid = row.booking_id as string | null;
    if (!bid || byBooking.has(bid)) continue;
    const stamp = (row.paid_at as string | null) || (row.created_at as string);
    if (stamp) byBooking.set(bid, stamp);
  }
  return bookings.map((b) => ({
    ...b,
    paidAt:
      byBooking.get(b.id) ||
      (b.amountPaidPkr > 0
        ? b.confirmationNotifiedAt || b.createdAt
        : undefined),
  }));
}

/** Persist a payments row when starting / completing checkout. */
export async function upsertPaymentForBooking(input: {
  bookingId: string;
  orderId?: string | null;
  amountPkr: number;
  tracker: string;
  kind?: "full" | "deposit" | "balance";
  status?: "pending" | "succeeded" | "failed";
  preferredMethod?: string | null;
  paidAt?: string | null;
}) {
  const sb = requireSupabase();
  const status = input.status || "pending";
  const paidAt =
    status === "succeeded"
      ? input.paidAt || new Date().toISOString()
      : null;

  const { data: existing } = await sb
    .from("payments")
    .select("id, paid_at")
    .eq("gateway_tracker", input.tracker)
    .eq("booking_id", input.bookingId)
    .maybeSingle();

  if (existing?.id) {
    // Idempotent retries: never overwrite a succeeded row's amount/paid_at
    // (avoids double-count perception when webhook + retries race).
    const { data: full } = await sb
      .from("payments")
      .select("id, status, amount_pkr, paid_at")
      .eq("id", existing.id)
      .maybeSingle();
    if (full?.status === "succeeded") {
      return existing.id as string;
    }
    const patch: Record<string, unknown> = {
      status,
      amount_pkr: input.amountPkr,
      preferred_method: input.preferredMethod || null,
    };
    if (paidAt && !existing.paid_at) {
      patch.paid_at = paidAt;
    }
    await sb.from("payments").update(patch).eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await sb
    .from("payments")
    .insert({
      booking_id: input.bookingId,
      order_id: input.orderId || null,
      kind: input.kind || "full",
      amount_pkr: input.amountPkr,
      status,
      gateway: "safepay",
      gateway_tracker: input.tracker,
      preferred_method: input.preferredMethod || null,
      paid_at: paidAt,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[upsertPaymentForBooking]", error.message);
    return null;
  }
  return data?.id as string;
}
