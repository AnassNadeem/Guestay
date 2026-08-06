import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import { releaseRoomHold } from "@/lib/bookings/holds";
import {
  findPaymentByNotificationId,
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
 * Safepay webhook — the ONLY path that sets Safepay bookings to paid.
 * HMAC-SHA512 of raw body (SAFEPAY_WEBHOOK_SECRET) required, then
 * verifyTracker, then finalize. Retries are idempotent via notification_id
 * on payments.gateway_payload (same alreadyReleased pattern as failed-payment)
 * and finalizeSuccessfulBooking.alreadyFinalized.
 *
 * Dashboard setup:
 * 1. Safepay → Developer → Webhooks → endpoint https://<site>/api/webhooks/safepay
 * 2. Copy webhook secret into SAFEPAY_WEBHOOK_SECRET
 * 3. Browser /checkout/return only stamps gateway_tracker and shows processing.
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
      value.length > 200
        ? `${value.slice(0, 120)}…[truncated len=${value.length}]`
        : value;
  });
  console.info("[safepay webhook] DIAG_HEADERS", dump);
}

function extractNotificationId(payload: Record<string, unknown>): string | null {
  const notification = payload.notification as
    | Record<string, unknown>
    | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  // Live Safepay deliveries use top-level `token` as the unique event id
  // (no `notification_id` field). Prefer explicit notification_id when present.
  return (
    (typeof payload.notification_id === "string" && payload.notification_id) ||
    (typeof payload.token === "string" && payload.token) ||
    (typeof notification?.id === "string" && notification.id) ||
    (typeof notification?.notification_id === "string" &&
      notification.notification_id) ||
    (typeof data?.notification_id === "string" && data.notification_id) ||
    (typeof data?.token === "string" && data.token) ||
    null
  );
}

export async function POST(req: Request) {
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

  const verifiedSig = verifySafepayWebhookSignature({
    secret,
    rawBody: raw,
    signatureHeader: sig,
  });
  if (!verifiedSig.ok) {
    console.warn("[safepay webhook] signature failed", verifiedSig.error);
    if (process.env.SAFEPAY_WEBHOOK_DEBUG_HEADERS === "1") {
      const { createHmac } = await import("crypto");
      const ts =
        req.headers.get("x-sfpy-timestamp") ||
        req.headers.get("x-safepay-timestamp") ||
        "";
      const provided = sig.trim().toLowerCase();
      const bodyBuf = Buffer.from(raw, "utf8");
      const trials: Record<string, boolean> = {};
      const check = (name: string, digest: string) => {
        trials[name] =
          digest === provided ||
          `sha512=${digest}` === provided ||
          `sha256=${digest}` === provided;
      };
      const utf8 = Buffer.from(secret, "utf8");
      let b64: Buffer | null = null;
      try {
        b64 = Buffer.from(secret, "base64");
        if (b64.length === 0) b64 = null;
      } catch {
        b64 = null;
      }
      check(
        "utf8_sha512_body",
        createHmac("sha512", utf8).update(bodyBuf).digest("hex"),
      );
      check(
        "utf8_sha256_body",
        createHmac("sha256", utf8).update(bodyBuf).digest("hex"),
      );
      if (/^[0-9a-fA-F]+$/.test(secret) && secret.length % 2 === 0) {
        const hexKey = Buffer.from(secret, "hex");
        check(
          "hex_sha512_body",
          createHmac("sha512", hexKey).update(bodyBuf).digest("hex"),
        );
        check(
          "hex_sha256_body",
          createHmac("sha256", hexKey).update(bodyBuf).digest("hex"),
        );
      }
      if (b64) {
        check(
          "b64_sha512_body",
          createHmac("sha512", b64).update(bodyBuf).digest("hex"),
        );
        check(
          "b64_sha256_body",
          createHmac("sha256", b64).update(bodyBuf).digest("hex"),
        );
      }
      if (ts) {
        check(
          "utf8_sha512_ts_body",
          createHmac("sha512", utf8)
            .update(ts, "utf8")
            .update(".", "utf8")
            .update(bodyBuf)
            .digest("hex"),
        );
        check(
          "utf8_sha256_ts_body",
          createHmac("sha256", utf8)
            .update(ts, "utf8")
            .update(".", "utf8")
            .update(bodyBuf)
            .digest("hex"),
        );
        if (b64) {
          check(
            "b64_sha256_ts_body",
            createHmac("sha256", b64)
              .update(ts, "utf8")
              .update(".", "utf8")
              .update(bodyBuf)
              .digest("hex"),
          );
        }
      }
      console.warn("[safepay webhook] DIAG_SIG", {
        error: verifiedSig.error,
        sigLen: provided.length,
        sigPrefix: provided.slice(0, 12),
        bodyLen: bodyBuf.length,
        hasTimestamp: Boolean(ts),
        timestampLen: ts.length,
        secretLen: secret.length,
        trials,
      });
    }
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
  const notificationId = extractNotificationId(payload);

  console.info("[safepay webhook] signature verified", {
    notificationId,
    keys: Object.keys(payload),
  });

  // notification_id replay protection (replaces timestamp freshness check).
  // Same idempotent success shape as failed-payment alreadyReleased.
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
        alreadyReleased: true,
        alreadyProcessed: true,
      });
    }
  }

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
    notificationId,
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
        notificationId,
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
          notificationId,
        });
      }
    }

    console.info("[safepay webhook] payment failed — hold released", {
      eventType,
      tracker,
      notificationId,
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
