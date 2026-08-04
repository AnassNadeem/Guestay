import { getLocalBooking } from "@/lib/bookings/local-store";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

async function userFromAuthHeader(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !hasSupabase()) return null;
  const sb = createServiceSupabase();
  const { data } = await sb.auth.getUser(token);
  return data.user ?? null;
}

/**
 * refund_requests.guest_id FK → profiles(id), not auth.users.
 * Ensure a profiles row exists before insert (orphan auth users break refunds).
 */
async function ensureGuestProfile(opts: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
}) {
  const sb = createServiceSupabase();
  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("id", opts.userId)
    .maybeSingle();
  if (existing?.id) return opts.userId;

  const { error } = await sb.from("profiles").insert({
    id: opts.userId,
    email: (opts.email || "").toLowerCase() || `user-${opts.userId.slice(0, 8)}@guestay.local`,
    full_name: opts.fullName || opts.email?.split("@")[0] || "Guest",
    role: "guest",
  });
  if (error) {
    // Race: another request created it
    const { data: again } = await sb
      .from("profiles")
      .select("id")
      .eq("id", opts.userId)
      .maybeSingle();
    if (again?.id) return opts.userId;
    throw new Error(
      `Could not create guest profile for refunds: ${error.message}`,
    );
  }
  return opts.userId;
}

export async function POST(req: Request) {
  const limited = await checkRateLimit({
    endpoint: "refund-request",
    key: clientIp(req),
    ...RATE_LIMITS.refundRequest,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const body = await req.json();
  const { bookingId, amountPkr, reason, notes } = body as {
    bookingId: string;
    amountPkr: number;
    reason: string;
    notes?: string;
  };

  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const booking = await getLocalBooking(bookingId);
  if (!booking) {
    console.warn("[refunds/request] booking not found", { bookingId });
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  const sb = createServiceSupabase();
  const sessionUser = await userFromAuthHeader(req);

  let paymentId: string | null = null;
  if (booking.gatewayTracker) {
    const { data: pay } = await sb
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("gateway_tracker", booking.gatewayTracker)
      .maybeSingle();
    paymentId = (pay?.id as string) || null;
  }
  if (!paymentId) {
    const { data: anyPay } = await sb
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    paymentId = (anyPay?.id as string) || null;
  }

  if (!paymentId) {
    const { data: created, error: payErr } = await sb
      .from("payments")
      .insert({
        booking_id: booking.id,
        kind: "full",
        amount_pkr: booking.amountPaidPkr || amountPkr || 1,
        status: "succeeded",
        gateway: "safepay",
        gateway_tracker: booking.gatewayTracker || null,
      })
      .select("id")
      .single();
    if (payErr || !created) {
      return NextResponse.json(
        { error: payErr?.message || "No payment record for booking" },
        { status: 400 },
      );
    }
    paymentId = created.id as string;
  }

  let guestId =
    sessionUser?.id ||
    booking.guestId ||
    null;
  if (!guestId) {
    const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = listed?.users?.find(
      (u) => u.email?.toLowerCase() === booking.guestEmail.toLowerCase(),
    );
    guestId = match?.id || null;
  }
  if (!guestId) {
    return NextResponse.json(
      {
        error:
          "Sign in to the account linked to this booking before requesting a refund.",
      },
      { status: 400 },
    );
  }

  // Guest may only request refunds for their own bookings.
  if (
    sessionUser &&
    booking.guestId &&
    booking.guestId !== sessionUser.id &&
    booking.guestEmail.toLowerCase() !== (sessionUser.email || "").toLowerCase()
  ) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  try {
    guestId = await ensureGuestProfile({
      userId: guestId,
      email: sessionUser?.email || booking.guestEmail,
      fullName: booking.guestName,
    });
  } catch (e) {
    console.error("[refunds/request] profile ensure failed", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not link guest profile for refund",
      },
      { status: 400 },
    );
  }

  // Link booking to guest if still unlinked
  if (!booking.guestId) {
    await sb
      .from("bookings")
      .update({ guest_id: guestId })
      .eq("id", booking.id);
  }

  console.info("[refunds/request] insert", {
    booking_id: booking.id,
    payment_id: paymentId,
    guest_id: guestId,
  });

  const { data: ticket, error } = await sb
    .from("refund_requests")
    .insert({
      booking_id: booking.id,
      payment_id: paymentId,
      guest_id: guestId,
      amount_pkr: amountPkr || booking.amountPaidPkr || 1,
      reason,
      notes: notes || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !ticket) {
    console.error("[refunds/request] insert failed", error?.message, {
      booking_id: booking.id,
      payment_id: paymentId,
      guest_id: guestId,
    });
    return NextResponse.json(
      { error: error?.message || "Failed to create refund request" },
      { status: 400 },
    );
  }

  // Notify staff
  try {
    await sb.from("notifications").insert({
      kind: "refund_request",
      title: "New refund request",
      body: `${booking.guestName} requested a refund on ${booking.reference}`,
      href: "/refunds",
      meta: { ticketId: ticket.id, bookingId: booking.id },
    });
  } catch {
    /* notifications table may not exist yet on older DBs */
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      bookingId: ticket.booking_id,
      paymentId: ticket.payment_id,
      amountPkr: ticket.amount_pkr,
      reason: ticket.reason,
      notes: ticket.notes,
      status: ticket.status,
      createdAt: ticket.created_at,
    },
  });
}

export async function GET(req: Request) {
  if (!hasSupabase()) {
    return NextResponse.json({ tickets: [] });
  }

  const user = await userFromAuthHeader(req);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required", tickets: [] },
      { status: 401 },
    );
  }

  const sb = createServiceSupabase();
  const { data } = await sb
    .from("refund_requests")
    .select("*")
    .eq("guest_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    tickets: (data || []).map((t) => ({
      id: t.id,
      bookingId: t.booking_id,
      paymentId: t.payment_id,
      amountPkr: t.amount_pkr,
      reason: t.reason,
      notes: t.notes,
      status: t.status,
      ownerNote: t.owner_note,
      createdAt: t.created_at,
    })),
  });
}
