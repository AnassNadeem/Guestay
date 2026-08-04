import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import { releaseRoomHold } from "@/lib/bookings/holds";
import {
  getLocalBooking,
  getLocalBookingByTracker,
  updateLocalBooking,
  upsertPaymentForBooking,
} from "@/lib/bookings/local-store";
import { verifySafepayWebhookSignature } from "@/lib/payments/safepay-webhook";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { NextResponse } from "next/server";

const FAILED_EVENT_TYPES = new Set([
  "payment.failed",
  "payment.rejected",
]);

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
/** Opt-in header dump — set SAFEPAY_WEBHOOK_DEBUG_HEADERS=1 on the worker. */
function logIncomingWebhookHeaders(req: Request) {
  if (process.env.SAFEPAY_WEBHOOK_DEBUG_HEADERS !== "1") return;
  const sensitiveName =
    /secret|token|auth|key|cookie|password|credential|api[-_]?key/i;
  const dump: Record<string, string> = {};
  req.headers.forEach((value, name) => {
    if (sensitiveName.test(name)) {
      dump[name] = value ? `[redacted len=${value.length}]` : "";
      return;
    }
    dump[name] =
      value.length > 200 ? `${value.slice(0, 120)}…[truncated len=${value.length}]` : value;
  });
  console.info("[safepay webhook] DIAG_HEADERS", dump);
}

export async function POST(req: Request) {
  // Diagnostic: log ALL headers before any signature logic (Step 1).
  logIncomingWebhookHeaders(req);

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

  const eventType =
    (typeof payload.type === "string" && payload.type) ||
    (typeof payload.event === "string" && payload.event) ||
    (typeof notification?.type === "string" && notification.type) ||
    (typeof data?.type === "string" && data.type) ||
    "";

  const tracker =
    (payload.tracker as string) ||
    (notification?.tracker as string) ||
    (data?.tracker as string) ||
    (data?.token as string);

  console.info("[safepay webhook]", {
    eventType: eventType || null,
    tracker,
    keys: Object.keys(payload),
  });

  if (!tracker) {
    return NextResponse.json({ received: true, updated: false });
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

  if (FAILED_EVENT_TYPES.has(eventType)) {
    const siblings = await getOrderBookings(booking);
    const alreadyReleased = siblings.every(
      (b) => b.status !== "pending_hold",
    );

    if (alreadyReleased) {
      console.info("[safepay webhook] payment failed — hold already released", {
        eventType,
        tracker,
        bookingId: booking.id,
        statuses: siblings.map((b) => b.status),
      });
      return NextResponse.json({
        received: true,
        updated: false,
        alreadyReleased: true,
      });
    }

    for (const b of siblings) {
      if (b.status !== "pending_hold") continue;
      await releaseRoomHold(b.id);
      if (b.gatewayTracker || tracker) {
        await upsertPaymentForBooking({
          bookingId: b.id,
          orderId: b.orderId,
          amountPkr: b.subtotalPkr,
          tracker: b.gatewayTracker || tracker,
          kind: b.paymentKind === "half" ? "deposit" : "full",
          status: "failed",
        });
      }
    }

    console.info("[safepay webhook] payment failed — hold released", {
      eventType,
      tracker,
      bookingId: booking.id,
      siblingIds: siblings.map((b) => b.id),
    });

    return NextResponse.json({
      received: true,
      updated: true,
      released: true,
    });
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
