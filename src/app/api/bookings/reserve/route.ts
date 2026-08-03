import {
  finalizeSuccessfulBooking,
  sessionUserIdFromRequest,
} from "@/lib/bookings/confirm";
import {
  createLocalHold,
  createLocalMultiHold,
  getLocalBooking,
  updateLocalBooking,
  upsertPaymentForBooking,
} from "@/lib/bookings/local-store";
import { checkLinesAvailability } from "@/lib/bookings/availability";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { getSiteUrl } from "@/lib/site-url";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

type Line = {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  holdBookingId?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomSlug,
      mode,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      payOption,
      preferredPaymentMethod,
      holdBookingId,
      lines,
    } = body as {
      roomSlug?: string;
      mode?: BookingMode;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      payOption: "full" | "half" | "none";
      preferredPaymentMethod?: "jazzcash" | "easypaisa" | "card" | "raast";
      holdBookingId?: string;
      lines?: Line[];
    };

    if (!guestName || !guestEmail || !guestPhone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const site = getSiteUrl(req);
    const sessionUserId = await sessionUserIdFromRequest(req);

    if (lines && lines.length > 0) {
      const availability = await checkLinesAvailability(
        lines.map((l) => ({
          roomSlug: l.roomSlug,
          mode: l.mode,
          checkIn: l.checkIn,
          checkOut: l.checkOut,
          guests: l.guests,
          excludeBookingId: l.holdBookingId,
        })),
      );
      if (!availability.ok) {
        return NextResponse.json(
          {
            error:
              availability.results.find((r) => !r.available)?.reason ||
              "One or more rooms are no longer available",
            results: availability.results,
          },
          { status: 409 },
        );
      }

      const order = await createLocalMultiHold({
        lines,
        guestName,
        guestEmail,
        guestPhone,
        preferredPaymentMethod,
      });

      if (order.isGroupNoAdvance || payOption === "none") {
        const primary = order.bookings[0]!;
        const finalized = await finalizeSuccessfulBooking({
          bookingId: primary.id,
          status: "confirmed_no_advance",
          sessionUserId,
        });
        return NextResponse.json({
          booking: finalized?.bookings[0] || primary,
          order: {
            ...order,
            reference: finalized?.reference || order.reference,
            bookings: finalized?.bookings || order.bookings,
          },
          reference: finalized?.reference,
          accountLinkScenario: finalized?.scenario,
        });
      }

      const amount =
        payOption === "half" ? order.halfPaymentPkr : order.fullPaymentPkr;
      const gateway = getPaymentGateway();
      const payment = await gateway.createPayment({
        amountPkr: amount,
        orderId: order.orderId,
        customerEmail: guestEmail,
        customerName: guestName,
        customerPhone: guestPhone,
        redirectUrl: `${site}/checkout/return`,
        cancelUrl: `${site}/checkout?cart=1`,
      });

      for (const b of order.bookings) {
        await updateLocalBooking(b.id, {
          gatewayTracker: payment.tracker,
          paymentKind: payOption === "half" ? "half" : "full",
          pendingSessionUserId: sessionUserId || undefined,
        });
        await upsertPaymentForBooking({
          bookingId: b.id,
          orderId: order.orderId,
          amountPkr: Math.round(amount / order.bookings.length),
          tracker: payment.tracker,
          kind: payOption === "half" ? "deposit" : "full",
          status: "pending",
          preferredMethod: preferredPaymentMethod || null,
        });
      }

      return NextResponse.json({
        booking: order.bookings[0],
        order,
        checkoutUrl: payment.checkoutUrl,
        preferredPaymentMethod,
      });
    }

    if (!roomSlug || !mode || !checkIn || !checkOut || !guests) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const singleCheck = await checkLinesAvailability([
      {
        roomSlug,
        mode,
        checkIn,
        checkOut,
        guests,
        excludeBookingId: holdBookingId,
      },
    ]);
    if (!singleCheck.ok) {
      return NextResponse.json(
        {
          error:
            singleCheck.results[0]?.reason ||
            "Room is no longer available for these dates",
          results: singleCheck.results,
        },
        { status: 409 },
      );
    }

    let booking;
    let quote;
    if (holdBookingId) {
      const existing = await getLocalBooking(holdBookingId);
      if (existing && existing.status === "pending_hold") {
        booking = (await updateLocalBooking(holdBookingId, {
          guestName,
          guestEmail,
          guestPhone,
        }))!;
        quote = {
          halfPaymentPkr: Math.ceil(booking.subtotalPkr / 2),
          fullPaymentPkr: booking.subtotalPkr,
          isGroupNoAdvance: booking.isGroupNoAdvance,
        };
      }
    }

    if (!booking || !quote) {
      const created = await createLocalHold({
        roomSlug,
        mode,
        checkIn,
        checkOut,
        guests,
        guestName,
        guestEmail,
        guestPhone,
      });
      booking = created.booking;
      quote = {
        halfPaymentPkr: Math.ceil(created.quote.staySubtotalPkr / 2),
        fullPaymentPkr: created.quote.staySubtotalPkr,
        isGroupNoAdvance: created.quote.isGroupNoAdvance,
      };
    }

    if (booking.isGroupNoAdvance || payOption === "none") {
      const finalized = await finalizeSuccessfulBooking({
        bookingId: booking.id,
        status: "confirmed_no_advance",
        sessionUserId,
      });
      return NextResponse.json({
        booking: finalized?.bookings[0] || {
          ...booking,
          status: "confirmed_no_advance",
        },
        reference: finalized?.reference,
        accountLinkScenario: finalized?.scenario,
      });
    }

    const amount =
      payOption === "half" ? quote.halfPaymentPkr : quote.fullPaymentPkr;
    const gateway = getPaymentGateway();
    const payment = await gateway.createPayment({
      amountPkr: amount,
      orderId: booking.id,
      customerEmail: guestEmail,
      customerName: guestName,
      customerPhone: guestPhone,
      redirectUrl: `${site}/checkout/return`,
      cancelUrl: `${site}/checkout?room=${roomSlug}&mode=${mode}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
    });

    await updateLocalBooking(booking.id, {
      gatewayTracker: payment.tracker,
      paymentKind: payOption === "half" ? "half" : "full",
      pendingSessionUserId: sessionUserId || undefined,
    });
    await upsertPaymentForBooking({
      bookingId: booking.id,
      amountPkr: amount,
      tracker: payment.tracker,
      kind: payOption === "half" ? "deposit" : "full",
      status: "pending",
      preferredMethod: preferredPaymentMethod || null,
    });

    return NextResponse.json({
      booking: {
        ...booking,
        gatewayTracker: payment.tracker,
        paymentKind: payOption,
      },
      checkoutUrl: payment.checkoutUrl,
      preferredPaymentMethod,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reserve failed" },
      { status: 400 },
    );
  }
}
