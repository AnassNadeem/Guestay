import {
  isSmtpConfigured,
  queueContactEnquiryEmail,
  sendContactEnquiryEmail,
} from "@/lib/mail/contact";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { NextResponse } from "next/server";

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  roomType?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Contact Us enquiries → hello@guestay.pk via Zoho SMTP.
 * Validates quickly, then queues the email so the guest isn't waiting on SMTP.
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit({
    endpoint: "contact",
    key: clientIp(request),
    ...RATE_LIMITS.contact,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  let body: ContactPayload;

  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const roomType = body.roomType?.trim() ?? "";

  if (!name) {
    return NextResponse.json(
      { error: "Please enter your name." },
      { status: 400 },
    );
  }
  if (!email) {
    return NextResponse.json(
      { error: "Please enter your email." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { error: "Please enter a message." },
      { status: 400 },
    );
  }

  const payload = {
    name,
    email,
    phone,
    roomType,
    message,
    receivedAt: new Date().toISOString(),
  };

  if (isSmtpConfigured()) {
    // Smoke / verify path: await so the caller learns if Nodemailer succeeded.
    if (request.headers.get("x-guestay-await-email") === "1") {
      const result = await sendContactEnquiryEmail(payload);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error || "Email send failed" },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, emailed: true });
    }
    // Don't block the response on Zoho TLS/login — send in the background
    await queueContactEnquiryEmail(payload);
    return NextResponse.json({ ok: true });
  }

  const webhook =
    process.env.CONTACT_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_CONTACT_WEBHOOK_URL;

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          source: "contact-form",
          subject: `[Contact form] Enquiry from ${name}`,
        }),
      });
      if (!res.ok) {
        return NextResponse.json(
          {
            error: "Could not deliver your message. Please call us instead.",
          },
          { status: 502 },
        );
      }
    } catch {
      return NextResponse.json(
        {
          error: "Could not deliver your message. Please call us instead.",
        },
        { status: 502 },
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("[contact] No ZOHO SMTP or CONTACT_WEBHOOK_URL configured");
    return NextResponse.json(
      {
        error:
          "Messaging is temporarily unavailable. Please call or email us directly.",
      },
      { status: 503 },
    );
  } else {
    console.info("[contact enquiry — not emailed, SMTP unset]", payload);
  }

  return NextResponse.json({ ok: true });
}
