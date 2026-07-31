import { checkLinesAvailability } from "@/lib/bookings/availability";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

type Line = {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  excludeBookingId?: string;
};

/** Hard availability + price re-check immediately before payment. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lines } = body as { lines?: Line[] };
    if (!lines?.length) {
      return NextResponse.json({ error: "No rooms to check" }, { status: 400 });
    }

    const check = await checkLinesAvailability(lines);
    if (!check.ok) {
      return NextResponse.json(
        {
          error: "One or more rooms are no longer available",
          results: check.results,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      results: check.results,
      totalPkr: check.results.reduce((s, r) => s + r.subtotalPkr, 0),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Availability check failed" },
      { status: 400 },
    );
  }
}
