import { getRoomBySlug } from "@/lib/mock";
import { quoteStay } from "@/lib/pricing";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomSlug = searchParams.get("room") || "";
  const mode = (searchParams.get("mode") || "shared") as BookingMode;
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests") || 1);

  const room = await getRoomBySlug(roomSlug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  try {
    const quote = quoteStay({
      room,
      mode,
      checkIn,
      checkOut,
      guestCount: guests,
      isDirect: true,
    });
    return NextResponse.json({ ...quote, roomName: room.name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quote failed" },
      { status: 400 },
    );
  }
}
