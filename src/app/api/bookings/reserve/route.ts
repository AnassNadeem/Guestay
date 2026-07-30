import {
  createLocalHold,
  createLocalMultiHold,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { getPaymentGateway } from "@/lib/payments/gateway";
import type { BookingMode } from "@/types";
import { NextResponse } from "next/server";

type Line = {
  roomSlug: string;
  mode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomSlug,
      mode,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      payOption,
      preferredPaymentMethod,
      lines,
    } = body as {
      roomSlug?: string;
      mode?: BookingMode;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      payOption: "full" | "half" | "none";
      preferredPaymentMethod?: "jazzcash" | "easypaisa" | "card" | "raast";
      lines?: Line[];
    };

    if (!guestName || !guestEmail || !guestPhone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Multi-room path
    if (lines && lines.length > 0) {
      const order = await createLocalMultiHold({
        lines,
        guestName,
        guestEmail,
        guestPhone,
        preferredPaymentMethod,
      });

      if (order.isGroupNoAdvance || payOption === "none") {
        void notifyEmail(order.reference, guestEmail);
        void ensureGuestAccount(guestEmail, guestName);
        return NextResponse.json({
          booking: order.bookings[0],
          order,
        });
      }

      const amount =
        payOption === "half" ? order.halfPaymentPkr : order.fullPaymentPkr;
      const gateway = getPaymentGateway();
      const payment = await gateway.createPayment({
        amountPkr: amount,
        orderId: order.reference,
        customerEmail: guestEmail,
        customerName: guestName,
        customerPhone: guestPhone,
        redirectUrl: `${site}/checkout/return`,
        cancelUrl: `${site}/checkout?cart=1`,
        metadata: {
          preferred_method: preferredPaymentMethod || "",
        },
      });

      for (const b of order.bookings) {
        updateLocalBooking(b.id, {
          gatewayTracker: payment.tracker,
          paymentKind: payOption === "half" ? "half" : "full",
        });
      }

      return NextResponse.json({
        booking: order.bookings[0],
        order,
        checkoutUrl: payment.checkoutUrl,
        preferredPaymentMethod,
      });
    }

    if (!roomSlug || !mode || !checkIn || !checkOut || !guests) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { booking, quote } = await createLocalHold({
      roomSlug,
      mode,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
    });

    if (booking.status === "confirmed_no_advance" || payOption === "none") {
      updateLocalBooking(booking.id, {
        status: "confirmed_no_advance",
        holdExpiresAt: null,
        paymentKind: "none",
        amountDuePkr: booking.subtotalPkr,
      });
      void notifyEmail(booking.reference, guestEmail);
      void ensureGuestAccount(guestEmail, guestName);
      return NextResponse.json({
        booking: { ...booking, status: "confirmed_no_advance" },
      });
    }

    const amount =
      payOption === "half" ? quote.halfPaymentPkr : quote.fullPaymentPkr;
    const gateway = getPaymentGateway();
    const payment = await gateway.createPayment({
      amountPkr: amount,
      orderId: booking.reference,
      customerEmail: guestEmail,
      customerName: guestName,
      customerPhone: guestPhone,
      redirectUrl: `${site}/checkout/return`,
      cancelUrl: `${site}/checkout?room=${roomSlug}&mode=${mode}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      metadata: {
        preferred_method: preferredPaymentMethod || "",
      },
    });

    updateLocalBooking(booking.id, {
      gatewayTracker: payment.tracker,
      paymentKind: payOption === "half" ? "half" : "full",
    });

    return NextResponse.json({
      booking: {
        ...booking,
        gatewayTracker: payment.tracker,
        paymentKind: payOption,
      },
      checkoutUrl: payment.checkoutUrl,
      preferredPaymentMethod,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reserve failed" },
      { status: 400 },
    );
  }
}

async function notifyEmail(reference: string, to: string) {
  const url = process.env.EMAIL_WORKER_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: "booking_confirmation",
        to,
        payload: { reference },
      }),
    });
  } catch {
    /* optional */
  }
}

/** Silent account create / link on successful booking (Supabase when configured). */
async function ensureGuestAccount(email: string, fullName: string) {
  try {
    const { hasSupabase, createServiceSupabase } = await import(
      "@/lib/supabase/client"
    );
    if (!hasSupabase()) return;
    const sb = createServiceSupabase();

    const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const existing = listed?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!existing) {
      await sb.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: fullName, display_name: fullName },
      });
    }

    const { data: linkData } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/account`,
      },
    });

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) return;

    // Prefer email_outbox + Worker; also try EMAIL_WORKER_URL directly
    try {
      await sb.from("email_outbox").insert({
        to_email: email,
        template: "magic_link",
        payload: { actionLink, fullName },
        status: "pending",
      });
    } catch {
      /* outbox optional */
    }

    const url = process.env.EMAIL_WORKER_URL;
    if (url) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "magic_link",
          to: email,
          payload: { actionLink, fullName },
        }),
      });
    }
  } catch {
    /* auth optional until credentials wired */
  }
}
