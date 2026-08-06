import { getLocalBooking, updateLocalBooking } from "@/lib/bookings/local-store";
import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import { sendRefundDecisionEmail } from "@/lib/mail/booking";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";

/**
 * Owner-only refund decision.
 * Manual process: updates ticket status + email only.
 * Does NOT call Safepay refund API — Owner refunds in Safepay dashboard.
 */
export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

export async function POST(req: Request) {
  const auth = await requireStaffRole(req, ["owner"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  try {
    return await handleDecide(req, auth.userId);
  } catch (err) {
    console.error("[refunds/decide] unhandled", err);
    return jsonWithAdminCors(
      req,
      {
        error:
          err instanceof Error ? err.message : "Refund decision failed",
      },
      { status: 500 },
    );
  }
}

async function handleDecide(req: Request, actorId: string) {
  const body = await req.json();
  const { ticketId, decision, ownerNote, amountPkr, bookingId } = body as {
    ticketId: string;
    decision: "approve" | "deny";
    ownerNote?: string;
    amountPkr?: number;
    bookingId?: string;
  };

  if (!hasSupabase()) {
    return jsonWithAdminCors(
      req,
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  if (!ticketId || (decision !== "approve" && decision !== "deny")) {
    return jsonWithAdminCors(
      req,
      { error: "ticketId and decision (approve|deny) are required" },
      { status: 400 },
    );
  }

  const status = decision === "deny" ? "denied" : "approved_processing";
  const sb = createServiceSupabase();

  const { data: ticket, error: ticketErr } = await sb
    .from("refund_requests")
    .select("id, booking_id, amount_pkr, status")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketErr || !ticket) {
    return jsonWithAdminCors(
      req,
      { error: "Refund request not found" },
      { status: 404 },
    );
  }

  const resolvedBookingId =
    (typeof bookingId === "string" && bookingId) || ticket.booking_id;
  const resolvedAmount =
    typeof amountPkr === "number" && amountPkr > 0
      ? amountPkr
      : ticket.amount_pkr;

  await sb
    .from("refund_requests")
    .update({
      status: decision === "deny" ? "denied" : "approved_processing",
      owner_note: ownerNote || null,
      decided_at: new Date().toISOString(),
      decided_by: actorId,
    })
    .eq("id", ticketId);

  await sb.from("audit_log").insert({
    action: decision === "deny" ? "refund_denied" : "refund_approved",
    table_name: "refund_requests",
    row_id: ticketId,
    actor_id: actorId,
    after: {
      bookingId: resolvedBookingId,
      amountPkr: resolvedAmount,
      ownerNote,
      status,
    },
  });

  const booking = resolvedBookingId
    ? await getLocalBooking(resolvedBookingId)
    : null;

  if (decision === "approve" && booking) {
    await updateLocalBooking(booking.id, {
      amountPaidPkr: Math.max(0, booking.amountPaidPkr - (resolvedAmount || 0)),
    });
  }

  console.info(
    decision === "deny" ? "[audit] refund_denied" : "[audit] refund_approved",
    {
      ticketId,
      bookingId: resolvedBookingId,
      amountPkr: resolvedAmount,
      ownerNote,
    },
  );

  let email: { ok: true } | { ok: false; error: string } | null = null;
  if (booking?.guestEmail) {
    try {
      email = await sendRefundDecisionEmail({
        to: booking.guestEmail,
        guestName: booking.guestName,
        decision,
        amountPkr: resolvedAmount,
        ownerNote,
        reference: booking.reference,
        ticketId,
      });
      if (!email.ok) {
        console.error("[refund email] send failed", email.error, {
          ticketId,
          decision,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send threw";
      console.error("[refund email] threw", message, { ticketId, decision });
      email = { ok: false, error: message };
    }
  } else {
    console.warn("[refund email] skipped — no guest email on booking", {
      ticketId,
      bookingId: resolvedBookingId,
    });
  }

  return jsonWithAdminCors(req, {
    status,
    ticketId,
    ownerNote: ownerNote || null,
    emailSent: email?.ok === true,
    ...(email && !email.ok ? { emailError: email.error } : {}),
  });
}
