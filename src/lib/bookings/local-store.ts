import { quoteStay } from "@/lib/pricing";
import { getRoomBySlug } from "@/lib/mock";
import {
  generateBookingReference,
  generateHoldReference,
} from "@/lib/bookings/reference";
import type { AccountLinkScenario } from "@/lib/mail/booking";
import type { BookingMode, BookingStatus } from "@/types";
import { randomBytes } from "crypto";

export type LocalBooking = {
  id: string;
  /** HOLD-… until payment/confirm; then guest-facing GST-XXXXXX */
  reference: string;
  /** Shared guest-facing reference for multi-room orders */
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
  /** Stashed at reserve when logged in — used after Safepay return */
  pendingSessionUserId?: string;
  accountLinkScenario?: AccountLinkScenario;
  confirmationNotifiedAt?: string;
  createdAt: string;
  notes?: string;
};

/** In-memory store when Supabase is not configured (local / Phase bootstrap). */
const g = globalThis as unknown as {
  __guestayBookings?: Map<string, LocalBooking>;
};

function store() {
  if (!g.__guestayBookings) g.__guestayBookings = new Map();
  return g.__guestayBookings;
}

export function listLocalBookings() {
  return Array.from(store().values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getLocalBooking(idOrRef: string) {
  for (const b of Array.from(store().values())) {
    if (
      b.id === idOrRef ||
      b.reference === idOrRef ||
      b.orderReference === idOrRef
    ) {
      return b;
    }
  }
  return null;
}

export function getLocalBookingByTracker(tracker: string) {
  for (const b of Array.from(store().values())) {
    if (b.gatewayTracker === tracker) return b;
  }
  return null;
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

  // Holds stay pending_hold with a HOLD- reference. Group / no-advance
  // confirmation (and GST reference) happens in finalizeSuccessfulBooking.
  const booking: LocalBooking = {
    id: randomBytes(8).toString("hex"),
    reference: generateHoldReference(),
    roomSlug: room.slug,
    roomName: room.name,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    guestCount: input.guests,
    bookingMode: input.mode,
    bedsBooked: quote.bedsBooked,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: quote.nights,
    status: "pending_hold",
    source: "direct",
    tierApplied: quote.tier,
    ratePerNightPkr: quote.ratePerNightPkr,
    subtotalPkr: quote.staySubtotalPkr,
    depositDuePkr: quote.depositDuePkr,
    amountPaidPkr: 0,
    amountDuePkr: quote.staySubtotalPkr,
    totalPkr: quote.staySubtotalPkr + quote.depositDuePkr,
    holdExpiresAt,
    isGroupNoAdvance: quote.isGroupNoAdvance,
    createdAt: new Date().toISOString(),
  };

  store().set(booking.id, booking);
  return { booking, quote };
}

export function updateLocalBooking(
  id: string,
  patch: Partial<LocalBooking>,
) {
  const existing = store().get(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  store().set(id, next);
  return next;
}

export function expireLocalHolds(now = Date.now()) {
  let count = 0;
  for (const b of Array.from(store().values())) {
    if (
      b.status === "pending_hold" &&
      b.holdExpiresAt &&
      new Date(b.holdExpiresAt).getTime() < now
    ) {
      b.status = "expired_hold";
      b.holdExpiresAt = null;
      count += 1;
    }
  }
  return count;
}

export function extendLocalHold(idOrRef: string, minutes?: number) {
  const booking = getLocalBooking(idOrRef);
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
  const orderId = randomBytes(8).toString("hex");
  // Temporary order key for gateway metadata — final GST ref minted on confirm
  const holdOrderKey = generateHoldReference();
  const holdExpiresAt = results[0]?.booking.holdExpiresAt ?? null;
  const totalGuests = input.lines.reduce((s, l) => s + l.guests, 0);
  const isGroup =
    totalGuests >= Number(process.env.GROUP_NO_ADVANCE_MIN_GUESTS || 10);

  for (const r of results) {
    updateLocalBooking(r.booking.id, {
      orderId,
      notes: `order:${orderId}`,
      isGroupNoAdvance: isGroup || r.booking.isGroupNoAdvance,
    });
  }

  return {
    orderId,
    /** Gateway order id until finalize mints GST-… */
    reference: holdOrderKey,
    holdExpiresAt,
    isGroupNoAdvance: isGroup,
    bookings: results.map((r) => getLocalBooking(r.booking.id)!),
    quotes: results.map((r) => r.quote),
    totalPkr: results.reduce((s, r) => s + r.quote.staySubtotalPkr, 0),
    halfPaymentPkr: Math.ceil(
      results.reduce((s, r) => s + r.quote.staySubtotalPkr, 0) / 2,
    ),
    fullPaymentPkr: results.reduce((s, r) => s + r.quote.staySubtotalPkr, 0),
  };
}

export function createWalkInBooking(input: {
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
  // Walk-in is paid immediately — mint the guest-facing reference now
  const reference = generateBookingReference();
  const booking: LocalBooking = {
    id: randomBytes(8).toString("hex"),
    reference,
    orderReference: reference,
    roomSlug: input.roomSlug,
    roomName: input.roomName,
    guestName: input.guestName,
    guestEmail: input.guestEmail || "walkin@guestay.pk",
    guestPhone: input.guestPhone,
    guestCount: input.guests,
    bookingMode: input.mode,
    bedsBooked: input.mode === "exclusive" ? input.guests : input.guests,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    status: "paid",
    source: "walk_in",
    tierApplied: 1,
    ratePerNightPkr: Math.round(input.amountCollectedPkr / nights) || 0,
    subtotalPkr: input.amountCollectedPkr,
    depositDuePkr: 0,
    amountPaidPkr: input.amountCollectedPkr,
    amountDuePkr: 0,
    totalPkr: input.amountCollectedPkr,
    holdExpiresAt: null,
    isGroupNoAdvance: false,
    paymentKind: "full",
    createdAt: new Date().toISOString(),
    notes: input.notes,
  };
  store().set(booking.id, booking);
  return booking;
}
