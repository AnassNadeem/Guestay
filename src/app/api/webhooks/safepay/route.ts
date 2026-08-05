import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import {
  findPaymentByNotificationId,
  getLocalBooking,
  getLocalBookingByTracker,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { verifySafepayWebhookSignature } from "@/lib/payments/safepay-webhook";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { NextResponse } from "next/server";

/**
 * Safepay webhook — the ONLY path that sets Safepay bookings to paid.
 * HMAC-SHA512 of raw body (SAFEPAY_WEBHOOK_SECRET) required, then
 * verifyTracker, then finalize. Retries are idempotent via notification_id
 * on payments.gateway_payload and finalizeSuccessfulBooking.alreadyFinalized.
 *
 * Dashboard setup:
 * 1. Safepay → Developer → Webhooks → endpoint https://<site>/api/webhooks/safepay
 * 2. Copy webhook secret into SAFEPAY_WEBHOOK_SECRET
 * 3. Browser /checkout/return only stamps gateway_tracker and shows processing.
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

  const verifiedSig = verifySafepayWebhookSignature({
    secret,
    rawBody: raw,
    signatureHeader: sig,
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

  const notificationId =
    (payload.notification_id as string) ||
    (notification?.id as string) ||
    (notification?.notification_id as string) ||
    (data?.notification_id as string) ||
    null;

  console.info("[safepay webhook] signature verified", {
    notificationId,
    keys: Object.keys(payload),
  });

  // notification_id replay protection (replaces timestamp freshness check).
  // Same idempotent success shape as alreadyFinalized — safe no-op, not an error.
  if (notificationId) {
    const prior = await findPaymentByNotificationId(notificationId);
    if (prior) {
      console.info("[safepay webhook] notification already processed", {
        notificationId,
        paymentId: prior.id,
      });
      return NextResponse.json({
        received: true,
        updated: false,
        alreadyProcessed: true,
        alreadyReleased: true,
      });
    }
  }

  const tracker =
    (payload.tracker as string) ||
    (notification?.tracker as string) ||
    (data?.tracker as string) ||
    (data?.token as string);

  console.info("[safepay webhook]", { tracker, notificationId, keys: Object.keys(payload) });

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
    notificationId,
  });

  console.info("[safepay webhook] finalized", {
    tracker,
    notificationId,
    reference: finalized?.reference,
    alreadyFinalized: finalized?.alreadyFinalized ?? false,
  });

  return NextResponse.json({
    received: true,
    updated: true,
    reference: finalized?.reference,
    alreadyFinalized: finalized?.alreadyFinalized ?? false,
  });
}
