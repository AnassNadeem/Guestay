import type { BookingMode, Room, RoomPricingTier } from "@/types";

export type PriceQuote = {
  nights: number;
  tier: 1 | 2 | 3 | 4;
  ratePerNightPkr: number;
  bedsBooked: number;
  bookingMode: BookingMode;
  staySubtotalPkr: number;
  depositListPkr: number;
  depositDiscountPkr: number;
  depositDuePkr: number;
  halfPaymentPkr: number;
  fullPaymentPkr: number;
  paymentRequired: boolean;
  isGroupNoAdvance: boolean;
  effectivePerNightPkr: number;
};

function pickTier(
  room: Room,
  mode: BookingMode,
): RoomPricingTier | undefined {
  return room.pricing.find((p) => p.bookingMode === mode);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00Z`);
  const b = new Date(`${checkOut}T12:00:00Z`);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function resolveTier(
  nights: number,
  pricing: RoomPricingTier,
): 1 | 2 | 3 | 4 {
  if (nights >= pricing.breakpointT4) return 4;
  if (nights >= pricing.breakpointT3) return 3;
  if (nights >= pricing.breakpointT2) return 2;
  return 1;
}

export function rateForTier(
  pricing: RoomPricingTier,
  tier: 1 | 2 | 3 | 4,
): number {
  switch (tier) {
    case 1:
      return pricing.tier1RatePkr;
    case 2:
      return pricing.tier2RatePkr;
    case 3:
      return pricing.tier3RatePkr;
    case 4:
      return pricing.tier4RatePkr;
  }
}

/**
 * Whole stay uses ONE tier bracket — no blending.
 * Shared: rate is per bed per night. Exclusive: rate is whole-unit per night.
 */
export function quoteStay(input: {
  room: Room;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  isDirect?: boolean;
  groupNoAdvanceMinGuests?: number;
  depositDiscountRate?: number;
}): PriceQuote {
  const {
    room,
    mode,
    checkIn,
    checkOut,
    guestCount,
    isDirect = true,
    groupNoAdvanceMinGuests = Number(
      process.env.GROUP_NO_ADVANCE_MIN_GUESTS ||
        process.env.NEXT_PUBLIC_GROUP_NO_ADVANCE_MIN_GUESTS ||
        10,
    ),
    depositDiscountRate = Number(
      process.env.DIRECT_BOOKING_DEPOSIT_DISCOUNT ||
        process.env.NEXT_PUBLIC_DIRECT_BOOKING_DEPOSIT_DISCOUNT ||
        0.1,
    ),
  } = input;

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    throw new Error("Stay must be at least 1 night");
  }

  const pricing = pickTier(room, mode);
  if (!pricing) {
    throw new Error(`Room does not support ${mode} booking`);
  }

  if (mode === "shared") {
    if (!room.allowsSharedBooking) {
      throw new Error("Shared booking not allowed for this room");
    }
    if (guestCount < 1 || guestCount > room.capacity) {
      throw new Error("Invalid bed / guest count");
    }
  } else if (!room.allowsExclusiveBooking) {
    throw new Error("Exclusive booking not allowed for this room");
  }

  const bedsBooked = mode === "shared" ? guestCount : room.capacity;
  const tier = resolveTier(nights, pricing);
  const rate = rateForTier(pricing, tier);
  const staySubtotalPkr =
    mode === "shared" ? nights * rate * bedsBooked : nights * rate;

  const depositListPkr = pricing.securityDepositPkr;
  const depositDiscountPkr = isDirect
    ? Math.round(depositListPkr * depositDiscountRate)
    : 0;
  const depositDuePkr = depositListPkr - depositDiscountPkr;

  const isGroupNoAdvance = guestCount >= groupNoAdvanceMinGuests;
  const paymentRequired = !isGroupNoAdvance;

  return {
    nights,
    tier,
    ratePerNightPkr: rate,
    bedsBooked,
    bookingMode: mode,
    staySubtotalPkr,
    depositListPkr,
    depositDiscountPkr,
    depositDuePkr,
    halfPaymentPkr: Math.ceil(staySubtotalPkr * 0.5),
    fullPaymentPkr: staySubtotalPkr,
    paymentRequired,
    isGroupNoAdvance,
    effectivePerNightPkr: Math.round(
      staySubtotalPkr / nights / (mode === "shared" ? bedsBooked : 1),
    ),
  };
}
