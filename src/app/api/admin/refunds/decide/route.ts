import {
  getLocalBooking,
  listLocalBookings,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

/**
 * Owner-only refund decision.
 * Manual process: updates ticket status + email only.
 * Does NOT call Safepay refund API — Owner refunds in Safepay dashboard.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { ticketId, decision, ownerNote, amountPkr, bookingId } = body as {
    ticketId: string;
    decision: "approve" | "deny";
    ownerNote?: string;
    amountPkr?: number;
    bookingId?: string;
  };

  const roleHeader = req.headers.get("x-guestay-role");
  if (roleHeader && roleHeader !== "owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  const status =
    decision === "deny" ? "denied" : "approved_processing";

  if (hasSupabase() && ticketId) {
    try {
      const sb = createServiceSupabase();
      await sb
        .from("refund_requests")
        .update({
          status: decision === "deny" ? "denied" : "approved",
          owner_note: ownerNote || null,
          decided_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      await sb.from("audit_log").insert({
        action: decision === "deny" ? "refund_denied" : "refund_approved",
        table_name: "refund_requests",
        row_id: ticketId,
        after: { bookingId, amountPkr, ownerNote, status },
      });
    } catch {
      /* local fallback below */
    }
  }

  if (decision === "deny") {
    console.info("[audit] refund_denied", { ticketId, ownerNote });
    const emailUrl = process.env.EMAIL_WORKER_URL;
    if (emailUrl && bookingId) {
      const b = getLocalBooking(bookingId);
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
    return NextResponse.json({
      status: "denied",
      ownerNote: ownerNote || null,
      ticketId,
    });
  }

  // Soft-update local booking paid amount for demo store only
  if (bookingId) {
    const b = getLocalBooking(bookingId);
    if (b) {
      updateLocalBooking(b.id, {
        amountPaidPkr: Math.max(0, b.amountPaidPkr - (amountPkr || 0)),
      });
    }
  }

  console.info("[audit] refund_approved", {
    ticketId,
    bookingId,
    amountPkr,
    ownerNote,
    bookings: listLocalBookings().length,
  });

  // Notify guest — processing email; actual money moved manually in Safepay
  const emailUrl = process.env.EMAIL_WORKER_URL;
  if (emailUrl && bookingId) {
    const b = getLocalBooking(bookingId);
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

  return NextResponse.json({
    status,
    ticketId,
  });
}
