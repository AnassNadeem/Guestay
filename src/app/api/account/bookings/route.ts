import {
  listBookingsByGuest,
  listLocalBookings,
  type LocalBooking,
} from "@/lib/bookings/local-store";
import { sessionUserIdFromRequest } from "@/lib/bookings/confirm";
import type { BookingStatus } from "@/types";
import { NextResponse } from "next/server";

const VISIBLE_STATUSES: BookingStatus[] = [
  "paid",
  "partially_paid",
  "confirmed_no_advance",
];

/** My Bookings — confirmed stays for the signed-in guest (Supabase). */
export async function GET(req: Request) {
  try {
    const sessionUserId = await sessionUserIdFromRequest(req);
    const emailHeader = req.headers.get("x-guestay-email");

    let bookings: LocalBooking[] = [];
    if (sessionUserId || emailHeader) {
      bookings = await listBookingsByGuest({
        guestId: sessionUserId,
        email: emailHeader,
      });
    }

    if (sessionUserId && bookings.length === 0) {
      const { hasSupabase, createServiceSupabase } = await import(
        "@/lib/supabase/client"
      );
      if (hasSupabase()) {
        const sb = createServiceSupabase();
        const { data } = await sb.auth.admin.getUserById(sessionUserId);
        const email = data.user?.email;
        if (email) {
          bookings = await listBookingsByGuest({ email });
        }
      }
    }

    if (
      bookings.length === 0 &&
      process.env.ACCOUNT_BOOKINGS_DEBUG_ALL === "1"
    ) {
      bookings = await listLocalBookings();
    }

    return NextResponse.json({
      bookings: bookings.filter((b) => VISIBLE_STATUSES.includes(b.status)),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load bookings" },
      { status: 500 },
    );
  }
}
