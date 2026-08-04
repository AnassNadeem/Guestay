import { checkLinesAvailability } from "@/lib/bookings/availability";
import {
  createRoomHold,
  releaseAbandonedCheckoutHolds,
  releaseHoldsByCartItemId,
  releaseRoomHold,
} from "@/lib/bookings/holds";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

type Line = {
  cartItemId: string;
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  /** Previous checkout hold to replace */
  previousBookingId?: string;
};

/**
 * Entering checkout: hard availability check + create short inventory holds.
 * Soft "Saved" items do not hold inventory until this runs.
 */
export async function POST(req: Request) {
  const limited = await checkRateLimit({
    endpoint: "start-checkout",
    key: clientIp(req),
    ...RATE_LIMITS.startCheckout,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json();
    const { lines } = body as { lines?: Line[] };
    if (!lines?.length) {
      return NextResponse.json({ error: "No rooms to hold" }, { status: 400 });
    }

    for (const line of lines) {
      if (
        !line.cartItemId ||
        !line.roomSlug ||
        !line.mode ||
        !line.checkIn ||
        !line.checkOut ||
        !line.guests
      ) {
        return NextResponse.json(
          { error: "Each line needs room, dates, and guests" },
          { status: 400 },
        );
      }
    }

    // Soft "Saved" never holds inventory. Prior checkout attempts do — and they
    // often used different cart line ids, so they were left behind and made
    // exclusive rooms look "unavailable". Clear abandoned locks first.
    await Promise.all(
      lines.map(async (line) => {
        await releaseAbandonedCheckoutHolds({
          roomSlug: line.roomSlug,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
        });
        await releaseHoldsByCartItemId(line.cartItemId);
        if (line.previousBookingId) {
          await releaseRoomHold(line.previousBookingId);
        }
      }),
    );

    // Sequential check so multiple lines on the same room don't overbook
    const claimed = new Map<string, number>();
    const results = [];
    for (const line of lines) {
      const base = await checkLinesAvailability([
        {
          roomSlug: line.roomSlug,
          mode: line.mode,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          guests: line.guests,
        },
      ]);
      const result = base.results[0]!;
      const key = `${line.roomSlug}|${line.checkIn}|${line.checkOut}`;
      const alreadyClaimed = claimed.get(key) || 0;
      const fits =
        result.available &&
        result.bedsOccupied + alreadyClaimed + result.bedsNeeded <=
          result.capacity;
      results.push({
        ...result,
        available: fits,
        reason: fits
          ? result.reason
          : result.reason ||
            `${result.roomName} is no longer available for these dates`,
      });
      if (fits) {
        claimed.set(key, alreadyClaimed + result.bedsNeeded);
      }
    }

    if (!results.every((r) => r.available)) {
      return NextResponse.json(
        {
          error: "One or more rooms are no longer available",
          results,
        },
        { status: 409 },
      );
    }

    const holds = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const quote = results[i]!;
      try {
        const hold = await createRoomHold({
          roomSlug: line.roomSlug,
          mode: line.mode,
          checkIn: line.checkIn,
          checkOut: line.checkOut,
          guests: line.guests,
          cartItemId: line.cartItemId,
          skipAvailabilityCheck: true,
        });
        holds.push({
          cartItemId: line.cartItemId,
          bookingId: hold.bookingId,
          reference: hold.reference,
          holdExpiresAt: hold.holdExpiresAt,
          nights: hold.nights,
          ratePerNightPkr: hold.ratePerNightPkr,
          subtotalPkr: hold.subtotalPkr,
          effectivePerNightPkr: hold.effectivePerNightPkr,
          bedsBooked: hold.bedsBooked,
          roomName: hold.roomName,
        });
      } catch (e) {
        for (const h of holds) {
          await releaseRoomHold(h.bookingId);
        }
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? e.message
                : `${quote.roomName} could not be held`,
            results,
          },
          { status: 409 },
        );
      }
    }

    const expiryTimes = holds
      .map((h) => h.holdExpiresAt)
      .filter((t): t is string => Boolean(t))
      .map((t) => new Date(t).getTime());

    return NextResponse.json({
      ok: true,
      holds,
      holdExpiresAt:
        expiryTimes.length > 0
          ? new Date(Math.min(...expiryTimes)).toISOString()
          : null,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start checkout" },
      { status: 400 },
    );
  }
}
