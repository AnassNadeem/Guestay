/**
 * Part E verification — refund decision emails via Nodemailer/Zoho.
 * Usage: npx tsx scripts/verify-refund-emails.ts
 *
 * 1) Sends approve + deny templates directly (same function decide uses).
 * 2) Hits POST /api/admin/refunds/decide for a real ticket when one exists
 *    (or skips the HTTP step with a clear note).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { sendRefundDecisionEmail, isBookingSmtpConfigured } = await import(
    "../src/lib/mail/booking"
  );

  if (!isBookingSmtpConfigured()) {
    throw new Error("ZOHO SMTP not configured in .env.local — cannot verify");
  }

  const to =
    process.env.INTERNAL_NOTIFICATION_EMAIL?.trim() ||
    process.env.ZOHO_SMTP_USER?.trim() ||
    process.env.E2E_GUEST_EMAIL?.trim();
  if (!to) {
    throw new Error("No recipient: set INTERNAL_NOTIFICATION_EMAIL or ZOHO_SMTP_USER");
  }

  console.log("SMTP configured. Sending approve + deny templates to", to);

  const approved = await sendRefundDecisionEmail({
    to,
    guestName: "Phase 7 Verify",
    decision: "approve",
    amountPkr: 1000,
    ownerNote: "[TEST] Phase 7 refund-approve email verification",
    reference: "VERIFY-APPROVE",
    ticketId: "verify-approve",
  });
  if (!approved.ok) {
    throw new Error(`approve email failed: ${approved.error}`);
  }
  console.log("PASS  sendRefundDecisionEmail(approve)");

  const denied = await sendRefundDecisionEmail({
    to,
    guestName: "Phase 7 Verify",
    decision: "deny",
    amountPkr: 1000,
    ownerNote: "[TEST] Phase 7 refund-deny email verification",
    reference: "VERIFY-DENY",
    ticketId: "verify-deny",
  });
  if (!denied.ok) {
    throw new Error(`deny email failed: ${denied.error}`);
  }
  console.log("PASS  sendRefundDecisionEmail(deny)");

  // Optional: exercise the decide route against a pending ticket (owner JWT).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerEmail = process.env.E2E_OWNER_EMAIL || "owner@guestay.test";
  const ownerPassword = process.env.E2E_OWNER_PASSWORD || "OwnerDemo#2026";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!url || !anon || !service) {
    console.log("SKIP  decide-route HTTP check (need Supabase keys)");
    console.log("All direct Zoho refund-email sends OK.\n");
    process.exit(0);
  }

  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ownerClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signErr } = await ownerClient.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });
  if (signErr || !signIn.session) {
    throw new Error(`owner login failed: ${signErr?.message}`);
  }
  const token = signIn.session.access_token;

  const { data: pendingRows } = await sb
    .from("refund_requests")
    .select("id, booking_id, amount_pkr, status")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(2);

  let pending = pendingRows;

  if (!pending || pending.length === 0) {
    console.log(
      "No pending refunds — creating two test tickets on a recent paid booking…",
    );
    const { data: paidBooking } = await sb
      .from("bookings")
      .select("id, guest_id")
      .in("status", ["paid", "partially_paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!paidBooking?.guest_id) {
      console.log(
        "SKIP  decide-route HTTP check (no paid booking to attach refunds)",
      );
      console.log("All direct Zoho refund-email sends OK.\n");
      process.exit(0);
    }
    const { data: payment } = await sb
      .from("payments")
      .select("id")
      .eq("booking_id", paidBooking.id)
      .limit(1)
      .maybeSingle();
    if (!payment?.id) {
      console.log("SKIP  decide-route HTTP check (no payment on paid booking)");
      console.log("All direct Zoho refund-email sends OK.\n");
      process.exit(0);
    }
    const inserts = await sb
      .from("refund_requests")
      .insert([
        {
          booking_id: paidBooking.id,
          payment_id: payment.id,
          guest_id: paidBooking.guest_id,
          amount_pkr: 500,
          reason: "[TEST] Phase 7 approve-path ticket",
          status: "pending",
        },
        {
          booking_id: paidBooking.id,
          payment_id: payment.id,
          guest_id: paidBooking.guest_id,
          amount_pkr: 500,
          reason: "[TEST] Phase 7 deny-path ticket",
          status: "pending",
        },
      ])
      .select("id, booking_id, amount_pkr, status");
    if (inserts.error || !inserts.data?.length) {
      throw new Error(
        `could not create test refund tickets: ${inserts.error?.message}`,
      );
    }
    pending = inserts.data;
  }

  const approveTicket = pending[0]!;
  const denyTicket = pending[1] ?? null;

  const approveRes = await fetch(`${site}/api/admin/refunds/decide`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ticketId: approveTicket.id,
      decision: "approve",
      ownerNote: "[TEST] Phase 7 decide approve",
      bookingId: approveTicket.booking_id,
      amountPkr: approveTicket.amount_pkr,
    }),
  });
  const approveBody = (await approveRes.json()) as {
    emailSent?: boolean;
    emailError?: string;
    error?: string;
    status?: string;
  };
  if (!approveRes.ok) {
    throw new Error(
      `decide approve HTTP ${approveRes.status}: ${approveBody.error || JSON.stringify(approveBody)}`,
    );
  }
  if (!approveBody.emailSent) {
    throw new Error(
      `decide approve returned without emailSent: ${approveBody.emailError || JSON.stringify(approveBody)}`,
    );
  }
  console.log("PASS  POST /api/admin/refunds/decide approve → emailSent");

  if (denyTicket) {
    const denyRes = await fetch(`${site}/api/admin/refunds/decide`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticketId: denyTicket.id,
        decision: "deny",
        ownerNote: "[TEST] Phase 7 decide deny",
        bookingId: denyTicket.booking_id,
        amountPkr: denyTicket.amount_pkr,
      }),
    });
    const denyBody = (await denyRes.json()) as {
      emailSent?: boolean;
      emailError?: string;
      error?: string;
    };
    if (!denyRes.ok) {
      throw new Error(
        `decide deny HTTP ${denyRes.status}: ${denyBody.error || JSON.stringify(denyBody)}`,
      );
    }
    if (!denyBody.emailSent) {
      throw new Error(
        `decide deny returned without emailSent: ${denyBody.emailError || JSON.stringify(denyBody)}`,
      );
    }
    console.log("PASS  POST /api/admin/refunds/decide deny → emailSent");
  } else {
    // Create a second synthetic pending ticket on the same booking for deny,
    // then decide it — only if a payment exists for that booking.
    const { data: payment } = await sb
      .from("payments")
      .select("id")
      .eq("booking_id", approveTicket.booking_id)
      .limit(1)
      .maybeSingle();
    const { data: booking } = await sb
      .from("bookings")
      .select("guest_id")
      .eq("id", approveTicket.booking_id)
      .maybeSingle();

    if (payment?.id && booking?.guest_id) {
      const { data: inserted, error: insErr } = await sb
        .from("refund_requests")
        .insert({
          booking_id: approveTicket.booking_id,
          payment_id: payment.id,
          guest_id: booking.guest_id,
          amount_pkr: Math.max(1, Math.floor((approveTicket.amount_pkr || 1000) / 2)),
          reason: "[TEST] Phase 7 deny-path ticket",
          status: "pending",
        })
        .select("id, booking_id, amount_pkr")
        .single();
      if (insErr || !inserted) {
        console.log("SKIP  decide deny HTTP (could not insert second ticket)", insErr?.message);
      } else {
        const denyRes = await fetch(`${site}/api/admin/refunds/decide`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketId: inserted.id,
            decision: "deny",
            ownerNote: "[TEST] Phase 7 decide deny",
            bookingId: inserted.booking_id,
            amountPkr: inserted.amount_pkr,
          }),
        });
        const denyBody = (await denyRes.json()) as {
          emailSent?: boolean;
          emailError?: string;
          error?: string;
        };
        if (!denyRes.ok || !denyBody.emailSent) {
          throw new Error(
            `decide deny failed: ${denyRes.status} ${denyBody.emailError || denyBody.error || JSON.stringify(denyBody)}`,
          );
        }
        console.log("PASS  POST /api/admin/refunds/decide deny → emailSent");
      }
    } else {
      console.log(
        "SKIP  decide deny HTTP (only one pending ticket and no payment/guest to clone)",
      );
    }
  }

  console.log("All refund-email verification OK.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
