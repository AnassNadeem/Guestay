import {
  getLocalBooking,
  listLocalBookings,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { NextResponse } from "next/server";

/** Owner-only refund decision (local + optional Safepay refund). */
export async function POST(req: Request) {
  const body = await req.json();
  const { ticketId, decision, ownerNote, tracker, amountPkr, bookingId } =
    body as {
      ticketId: string;
      decision: "approve" | "deny";
      ownerNote?: string;
      tracker?: string;
      amountPkr?: number;
      bookingId?: string;
    };

  // In production this checks Owner role via Supabase session.
  const roleHeader = req.headers.get("x-guestay-role");
  if (roleHeader && roleHeader !== "owner") {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }

  if (decision === "deny") {
    return NextResponse.json({
      status: "denied",
      ownerNote: ownerNote || null,
      ticketId,
    });
  }

  const gateway = getPaymentGateway();
  if (tracker && amountPkr && gateway.refund) {
    try {
      await gateway.refund({ tracker, amountPkr });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Refund failed" },
        { status: 502 },
      );
    }
  }

  if (bookingId) {
    const b = getLocalBooking(bookingId);
    if (b) {
      updateLocalBooking(b.id, {
        amountPaidPkr: Math.max(0, b.amountPaidPkr - (amountPkr || 0)),
      });
    }
  }

  // Audit stub
  console.info("[audit] refund_approved", {
    ticketId,
    bookingId,
    amountPkr,
    ownerNote,
    bookings: listLocalBookings().length,
  });

  return NextResponse.json({
    status: "approved_processing",
    ticketId,
  });
}
