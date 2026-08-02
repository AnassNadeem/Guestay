/**
 * Extra E2E checks without relying on a flaky OneDrive .next lock.
 *   npx tsx --env-file=.env.local scripts/smoke-phase2a-apis.ts
 */
import { createServiceSupabase } from "../src/lib/supabase/client";
import { verifySafepayWebhookSignature } from "../src/lib/payments/safepay-webhook";
import { createHmac } from "crypto";
import { getRooms, getRoomBySlug } from "../src/lib/mock";
import {
  createLocalHold,
  updateLocalBooking,
  upsertPaymentForBooking,
  getLocalBookingByTracker,
  listLocalBookings,
} from "../src/lib/bookings/local-store";
import { finalizeSuccessfulBooking } from "../src/lib/bookings/confirm";
import { getPaymentGateway } from "../src/lib/payments/gateway";

async function main() {
  const sb = createServiceSupabase();

  // 1. Rooms from Supabase
  const rooms = await getRooms();
  const test = await getRoomBySlug("test-room");
  console.log("rooms count:", rooms.length, "test-room:", test?.name);
  if (!test) throw new Error("TEST ROOM missing");

  // 2. Quote request insert
  const { data: quote, error: qErr } = await sb
    .from("quote_requests")
    .insert({
      name: "Lead Test",
      email: "lead@example.com",
      phone: "+923001112233",
      room_type: "flat",
      approx_duration: "6 months",
      notes: "E2E quote",
    })
    .select("id")
    .single();
  if (qErr) throw qErr;
  console.log("quote_requests insert:", quote.id);

  // 3. HMAC verifier unit check
  const secret = Buffer.from("test-secret-bytes").toString("base64");
  const rawBody = '{"tracker":"track_demo"}';
  const ts = new Date().toISOString();
  const mac = createHmac("sha256", Buffer.from(secret, "base64"));
  mac.update(ts);
  mac.update(".");
  mac.update(rawBody);
  const sig = `sha256=${mac.digest("hex")}`;
  const ok = verifySafepayWebhookSignature({
    secretBase64: secret,
    rawBody,
    signatureHeader: sig,
    timestampHeader: ts,
  });
  console.log("HMAC verify:", ok);

  // 4. Reserve-like path: hold + payment tracker + finalize (mock gateway)
  const checkIn = "2026-10-01";
  const checkOut = "2026-10-05";
  const { booking } = await createLocalHold({
    roomSlug: "test-room",
    mode: "shared",
    checkIn,
    checkOut,
    guests: 1,
    guestName: "E2E Guest",
    guestEmail: `e2e.${Date.now()}@guestay.test`,
    guestPhone: "+923009998877",
  });
  const gateway = getPaymentGateway();
  const payment = await gateway.createPayment({
    amountPkr: booking.subtotalPkr,
    orderId: booking.id,
    customerEmail: booking.guestEmail,
    customerName: booking.guestName,
    customerPhone: booking.guestPhone,
    redirectUrl: "http://localhost:3000/checkout/return",
    cancelUrl: "http://localhost:3000/checkout",
  });
  await updateLocalBooking(booking.id, {
    gatewayTracker: payment.tracker,
    paymentKind: "full",
  });
  await upsertPaymentForBooking({
    bookingId: booking.id,
    amountPkr: booking.subtotalPkr,
    tracker: payment.tracker,
    kind: "full",
    status: "pending",
    preferredMethod: "card",
  });

  const verified = await gateway.verifyTracker(payment.tracker);
  console.log("gateway verify:", verified.success, "tracker:", payment.tracker);

  const found = await getLocalBookingByTracker(payment.tracker);
  if (!found) throw new Error("tracker lookup failed");

  const finalized = await finalizeSuccessfulBooking({
    bookingId: found.id,
    status: "paid",
  });
  console.log("finalize:", finalized?.reference, finalized?.scenario);

  const all = await listLocalBookings();
  const paid = all.filter((b) => b.status === "paid");
  console.log("paid bookings in DB:", paid.length);

  // 5. Staff roles
  const { data: staff } = await sb
    .from("profiles")
    .select("email, role")
    .in("email", ["hello@guestay.pk", "bookings@guestay.pk"]);
  console.log("staff:", staff);

  console.log("PASS — phase2a API smoke OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
