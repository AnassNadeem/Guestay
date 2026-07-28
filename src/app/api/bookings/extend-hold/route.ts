import { extendLocalHold, getLocalBooking } from "@/lib/bookings/local-store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, reference } = body as {
      bookingId?: string;
      reference?: string;
    };
    const key = bookingId || reference;
    if (!key) {
      return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    }

    const minutes = Number(process.env.BOOKING_HOLD_MINUTES || 15);
    const updated = extendLocalHold(key, minutes);
    if (!updated) {
      const existing = getLocalBooking(key);
      if (!existing) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Hold can no longer be extended" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      holdExpiresAt: updated.holdExpiresAt,
      booking: updated,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Extend failed" },
      { status: 400 },
    );
  }
}
