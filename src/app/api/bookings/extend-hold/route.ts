import { extendRoomHold, releaseRoomHold } from "@/lib/bookings/holds";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, reference, release } = body as {
      bookingId?: string;
      reference?: string;
      release?: boolean;
    };
    const key = bookingId || reference;
    if (!key) {
      return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
    }

    if (release) {
      await releaseRoomHold(key);
      return NextResponse.json({ ok: true, released: true });
    }

    const minutes = Number(process.env.BOOKING_HOLD_MINUTES || 10);
    const updated = await extendRoomHold(key, minutes);
    if (!updated) {
      return NextResponse.json(
        { error: "Hold can no longer be extended" },
        { status: 409 },
      );
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Extend failed" },
      { status: 400 },
    );
  }
}
