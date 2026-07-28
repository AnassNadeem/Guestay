import { createWalkInBooking } from "@/lib/bookings/local-store";
import { getRoomBySlug } from "@/lib/mock";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const room = await getRoomBySlug(body.roomSlug);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    const booking = createWalkInBooking({
      roomSlug: room.slug,
      roomName: room.name,
      mode: (body.mode || "exclusive") as BookingMode,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: Number(body.guests) || 1,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      guestEmail: body.guestEmail,
      amountCollectedPkr: Number(body.amountCollectedPkr) || 0,
      notes: body.notes,
    });
    return NextResponse.json({ booking });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
