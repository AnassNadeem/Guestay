import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import {
  getLocalBooking,
  getLocalBookingByTracker,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { verifySafepayWebhookSignature } from "@/lib/payments/safepay-webhook";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { NextResponse } from "next/server";

/**
 * Safepay webhook — optional idempotent backup.
 *
 * Testing stage: /checkout/return finalizes paid after verifyTracker.
 * This endpoint stays for production webhook delivery later; retries are
 * safe via finalizeSuccessfulBooking.alreadyFinalized.
 *
 * Dashboard setup (when re-enabling):
 * 1. Safepay → Developer → Webhooks → endpoint https://<site>/api/webhooks/safepay
 * 2. Copy webhook secret into SAFEPAY_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.warn(
      "[safepay webhook] SAFEPAY_WEBHOOK_SECRET unset — rejecting. Configure webhook in Safepay dashboard; bookings will stay in processing until webhooks are live.",
    );
    return NextResponse.json(
      {
        error:
          "Webhook secret not configured. Safepay payments cannot be finalized without a verified webhook.",
      },
      { status: 503 },
    );
  }

  const sig =
    req.headers.get("x-sfpy-signature") ||
    req.headers.get("x-safepay-signature") ||
    "";
  const timestamp =
    req.headers.get("x-sfpy-timestamp") ||
    req.headers.get("x-safepay-timestamp") ||
    "";

  const verifiedSig = verifySafepayWebhookSignature({
    secretBase64: secret,
    rawBody: raw,
    signatureHeader: sig,
    timestampHeader: timestamp,
  });
  if (!verifiedSig.ok) {
    console.warn("[safepay webhook] signature failed", verifiedSig.error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notification = payload.notification as
    | Record<string, unknown>
    | undefined;
  const data = payload.data as Record<string, unknown> | undefined;

  const tracker =
    (payload.tracker as string) ||
    (notification?.tracker as string) ||
    (data?.tracker as string) ||
    (data?.token as string);

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

  let booking = await getLocalBookingByTracker(tracker);
  if (!booking) {
    const orderId =
      (payload.order_id as string) ||
      ((payload.metadata as Record<string, string> | undefined)?.order_id);
    if (orderId) {
      booking = await getLocalBooking(orderId);
    }
  }

  if (!booking) {
    return NextResponse.json({ received: true, updated: false });
  }

  const siblings = await getOrderBookings(booking);
  const status = "paid";
  const amounts = siblings.map((b) => ({
    id: b.id,
    amountPaidPkr: b.subtotalPkr,
    amountDuePkr: 0,
  }));

  for (const b of siblings) {
    await updateLocalBooking(b.id, { gatewayTracker: tracker });
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
