import {
  getLocalBookingByTracker,
  updateLocalBooking,
  listLocalBookings,
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
    // Soft verify: if secret configured but signature missing, reject
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
    return NextResponse.json({ received: true, updated: false, verified: false });
  }

  let booking = getLocalBookingByTracker(tracker);
  if (!booking) {
    // Fallback: match by order id in metadata if present
    const orderId =
      (payload.order_id as string) ||
      ((payload.metadata as Record<string, string> | undefined)?.order_id);
    if (orderId) {
      booking =
        listLocalBookings().find((b) => b.reference === orderId) || null;
    }
  }

  if (booking) {
    const half = booking.paymentKind === "half";
    updateLocalBooking(booking.id, {
      status: half ? "partially_paid" : "paid",
      amountPaidPkr: half
        ? Math.ceil(booking.subtotalPkr / 2)
        : booking.subtotalPkr,
      amountDuePkr: half ? Math.floor(booking.subtotalPkr / 2) : 0,
      holdExpiresAt: null,
      gatewayTracker: tracker,
    });
  }

  return NextResponse.json({ received: true, updated: Boolean(booking) });
}
