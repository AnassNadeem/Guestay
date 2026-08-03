import { getOrderBookings } from "@/lib/bookings/confirm";
import { getLocalBookingByTracker } from "@/lib/bookings/local-store";
import { NextResponse } from "next/server";

const TERMINAL = new Set([
  "paid",
  "partially_paid",
  "confirmed_no_advance",
  "cancelled",
]);

/**
 * Poll helper for /booking-confirmed when a tracker URL is still open.
 * Read-only; never writes paid status (return page finalizes in testing).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tracker = url.searchParams.get("tracker")?.trim();
  if (!tracker) {
    return NextResponse.json({ error: "tracker required" }, { status: 400 });
  }

  const booking = await getLocalBookingByTracker(tracker);
  if (!booking) {
    return NextResponse.json({
      found: false,
      ready: false,
      status: null,
      reference: null,
      scenario: null,
    });
  }

  const siblings = await getOrderBookings(booking);
  const ready = siblings.every((b) => TERMINAL.has(b.status));
  const primary = siblings[0]!;

  return NextResponse.json({
    found: true,
    ready,
    status: primary.status,
    reference: primary.reference,
    scenario: primary.accountLinkScenario || null,
    guestName: primary.guestName,
  });
}
