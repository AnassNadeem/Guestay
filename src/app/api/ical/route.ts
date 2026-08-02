import { listLocalBookings } from "@/lib/bookings/local-store";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

function toIcsDate(date: string) {
  return date.replace(/-/g, "");
}

/** Public export used by Airbnb/Booking.com calendar import + Worker proxy. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || searchParams.get("room") || "";

  if (!hasSupabase()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const sb = createServiceSupabase();
  let roomQuery = sb
    .from("rooms")
    .select("id, slug, name")
    .eq("status", "active");

  const { data: rooms } = await roomQuery;
  const room =
    (rooms || []).find((r) => r.id === token || r.slug === token) ||
    (rooms || [])[0];

  if (!room) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bookings = (await listLocalBookings()).filter(
    (b) =>
      b.roomSlug === room.slug &&
      ["pending_hold", "partially_paid", "paid", "confirmed_no_advance"].includes(
        b.status,
      ) &&
      (b.status !== "pending_hold" ||
        (b.holdExpiresAt && new Date(b.holdExpiresAt) > new Date())),
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Guestay//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const b of bookings) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.reference}@guestay.pk`,
      `DTSTART;VALUE=DATE:${toIcsDate(b.checkIn)}`,
      `DTEND;VALUE=DATE:${toIcsDate(b.checkOut)}`,
      `SUMMARY:Guestay blocked (${b.source})`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=120",
    },
  });
}
