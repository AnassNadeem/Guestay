import { createRoomHold } from "@/lib/bookings/holds";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

/** Create a per-room hold when guest taps Add / Book Now. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomSlug,
      mode,
      checkIn,
      checkOut,
      guests,
      cartItemId,
      guestName,
      guestEmail,
      guestPhone,
    } = body as {
      roomSlug: string;
      mode: BookingMode;
      checkIn: string;
      checkOut: string;
      guests: number;
      cartItemId: string;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
    };

    if (!roomSlug || !mode || !checkIn || !checkOut || !guests || !cartItemId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const hold = await createRoomHold({
      roomSlug,
      mode,
      checkIn,
      checkOut,
      guests,
      cartItemId,
      guestName,
      guestEmail,
      guestPhone,
    });

    return NextResponse.json(hold);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hold failed" },
      { status: 400 },
    );
  }
}
