import { sendQuoteRequestNotification } from "@/lib/mail/quote";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    endpoint: "quote-request",
    key: clientIp(req),
    ...RATE_LIMITS.quoteRequest,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const roomType = String(body.roomType || "").trim() || null;
    const approxRoomsOrGuests =
      String(body.approxRoomsOrGuests || "").trim() || null;
    const approxMoveIn = String(body.approxMoveIn || "").trim() || null;
    const approxDuration = String(body.approxDuration || "").trim() || null;
    const notes = String(body.notes || "").trim() || null;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 },
      );
    }

    if (!hasSupabase()) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 },
      );
    }

    const sb = createServiceSupabase();
    const { data, error } = await sb
      .from("quote_requests")
      .insert({
        name,
        email,
        phone,
        room_type: roomType,
        approx_rooms_or_guests: approxRoomsOrGuests,
        approx_move_in: approxMoveIn,
        approx_duration: approxDuration,
        notes,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to save quote request" },
        { status: 400 },
      );
    }

    void sendQuoteRequestNotification({
      name,
      email,
      phone,
      roomType,
      approxRoomsOrGuests,
      approxMoveIn,
      approxDuration,
      notes,
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
