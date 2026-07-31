import { listLocalBookings } from "@/lib/bookings/local-store";
import type { BookingStatus } from "@/types";
import { NextResponse } from "next/server";

const VISIBLE_STATUSES: BookingStatus[] = [
  "paid",
  "partially_paid",
  "confirmed_no_advance",
];

/** My Bookings — confirmed stays only (never pending_hold / expired). */
export async function GET() {
  const bookings = listLocalBookings().filter((b) =>
    VISIBLE_STATUSES.includes(b.status),
  );
  return NextResponse.json({ bookings });
}
