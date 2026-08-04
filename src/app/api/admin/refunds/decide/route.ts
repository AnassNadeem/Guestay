import { getLocalBooking, updateLocalBooking } from "@/lib/bookings/local-store";
import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
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

  const status = decision === "deny" ? "denied" : "approved_processing";
  const sb = createServiceSupabase();

  if (ticketId) {
    await sb
      .from("refund_requests")
      .update({
        status: decision === "deny" ? "denied" : "approved_processing",
        owner_note: ownerNote || null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    await sb.from("audit_log").insert({
      action: decision === "deny" ? "refund_denied" : "refund_approved",
      table_name: "refund_requests",
      row_id: ticketId,
      actor_id: auth.userId,
      after: { bookingId, amountPkr, ownerNote, status },
    });
  }

  if (decision === "deny") {
    console.info("[audit] refund_denied", { ticketId, ownerNote });
    const emailUrl = process.env.EMAIL_WORKER_URL;
    if (emailUrl && bookingId) {
      const b = await getLocalBooking(bookingId);
      if (b?.guestEmail) {
        void fetch(emailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: "refund_denied",
            to: b.guestEmail,
            payload: { ticketId, ownerNote, amountPkr },
          }),
        }).catch(() => undefined);
      }
    }
    return jsonWithAdminCors(req, {
      status: "denied",
      ownerNote: ownerNote || null,
      ticketId,
    });
  }

  if (bookingId) {
    const b = await getLocalBooking(bookingId);
    if (b) {
      await updateLocalBooking(b.id, {
        amountPaidPkr: Math.max(0, b.amountPaidPkr - (amountPkr || 0)),
      });
    }
  }

  console.info("[audit] refund_approved", {
    ticketId,
    bookingId,
    amountPkr,
    ownerNote,
  });

  const emailUrl = process.env.EMAIL_WORKER_URL;
  if (emailUrl && bookingId) {
    const b = await getLocalBooking(bookingId);
    if (b?.guestEmail) {
      void fetch(emailUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "refund_processing",
          to: b.guestEmail,
          payload: { ticketId, ownerNote, amountPkr },
        }),
      }).catch(() => undefined);
    }
  }

  return jsonWithAdminCors(req, {
    status,
    ticketId,
  });
}
