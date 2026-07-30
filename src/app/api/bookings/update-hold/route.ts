import { updateRoomHoldDates } from "@/lib/bookings/holds";
import { NextResponse } from "next/server";

/** Re-quote + refresh hold for one cart line after date edit. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, checkIn, checkOut, guests } = body as {
      bookingId: string;
      checkIn: string;
      checkOut: string;
      guests?: number;
    };

    if (!bookingId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const hold = await updateRoomHoldDates({
      bookingId,
      checkIn,
      checkOut,
      guests,
    });

    return NextResponse.json(hold);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}
