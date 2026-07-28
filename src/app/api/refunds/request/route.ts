import { getLocalBooking } from "@/lib/bookings/local-store";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const g = globalThis as unknown as {
  __guestayRefunds?: Map<string, Record<string, unknown>>;
};

function refunds() {
  if (!g.__guestayRefunds) g.__guestayRefunds = new Map();
  return g.__guestayRefunds;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { bookingId, amountPkr, reason, notes } = body as {
    bookingId: string;
    amountPkr: number;
    reason: string;
    notes?: string;
  };

  const booking = getLocalBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  const id = randomBytes(6).toString("hex");
  const ticket = {
    id,
    bookingId: booking.id,
    paymentId: booking.gatewayTracker || null,
    guestEmail: booking.guestEmail,
    amountPkr: amountPkr || booking.amountPaidPkr,
    reason,
    notes: notes || null,
    status: "pending",
    ownerNote: null,
    createdAt: new Date().toISOString(),
  };
  refunds().set(id, ticket);
  return NextResponse.json({ ticket });
}

export async function GET() {
  return NextResponse.json({
    tickets: Array.from(refunds().values()),
  });
}
