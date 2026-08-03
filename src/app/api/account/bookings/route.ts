import {
  listBookingsByGuest,
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
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let bookings: LocalBooking[] = await listBookingsByGuest({
      guestId: sessionUserId,
    });

    // Fallback: match by the verified session user's email when guest_id
    // was not linked at booking time (e.g. guest paid before claiming account).
    if (bookings.length === 0) {
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
