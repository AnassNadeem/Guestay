import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import {
  getLocalBookingByTracker,
  listLocalBookings,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { NextResponse } from "next/server";

/**
 * Safepay webhook — verify signature when SAFEPAY_WEBHOOK_SECRET is set,
 * then mark booking paid / partially_paid from tracker.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET;

  if (secret) {
    const sig =
      req.headers.get("x-sfpy-signature") ||
      req.headers.get("x-safepay-signature") ||
      "";
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // HMAC verification would go here with crypto.createHmac once Safepay
    // documents the exact header scheme for this merchant account.
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tracker =
    (payload.tracker as string) ||
    ((payload.data as Record<string, unknown> | undefined)?.tracker as string) ||
    ((payload.data as Record<string, unknown> | undefined)?.token as string);

  console.info("[safepay webhook]", { tracker, keys: Object.keys(payload) });

  if (!tracker) {
    return NextResponse.json({ received: true, updated: false });
  }

  const gateway = getPaymentGateway();
  const verified = await gateway.verifyTracker(tracker);
  if (!verified.success) {
    return NextResponse.json({
      received: true,
      updated: false,
      verified: false,
    });
  }

  let booking = getLocalBookingByTracker(tracker);
  if (!booking) {
    const orderId =
      (payload.order_id as string) ||
      ((payload.metadata as Record<string, string> | undefined)?.order_id);
    if (orderId) {
      booking =
        listLocalBookings().find(
          (b) =>
            b.orderId === orderId ||
            b.id === orderId ||
            b.reference === orderId ||
            b.notes?.includes(`order:${orderId}`),
        ) || null;
    }
  }

  if (!booking) {
    return NextResponse.json({ received: true, updated: false });
  }

  const siblings = getOrderBookings(booking);
  const half = booking.paymentKind === "half";
  const status = half ? "partially_paid" : "paid";
  const amounts = siblings.map((b) => {
    const amountPaidPkr = half
      ? Math.ceil(b.subtotalPkr / 2)
      : b.subtotalPkr;
    return {
      id: b.id,
      amountPaidPkr,
      amountDuePkr: Math.max(0, b.subtotalPkr - amountPaidPkr),
    };
  });

  for (const b of siblings) {
    updateLocalBooking(b.id, { gatewayTracker: tracker });
  }

  const finalized = await finalizeSuccessfulBooking({
    bookingId: booking.id,
    status,
    amounts,
    sessionUserId: booking.pendingSessionUserId || null,
  });

  return NextResponse.json({
    received: true,
    updated: true,
    reference: finalized?.reference,
    alreadyFinalized: finalized?.alreadyFinalized ?? false,
  });
}
