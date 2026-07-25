import { NextResponse } from "next/server";

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  roomType?: string;
  message?: string;
};

/**
 * Phase 1 contact stub.
 * - Always validates and returns success for local/dev.
 * - If CONTACT_WEBHOOK_URL (or NEXT_PUBLIC_CONTACT_WEBHOOK_URL) is set,
 *   forwards the payload so n8n / a Cloudflare Worker can email or log leads.
 */
export async function POST(request: Request) {
  let body: ContactPayload;

  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  const payload = {
    name,
    email,
    phone: body.phone?.trim() ?? "",
    roomType: body.roomType?.trim() ?? "",
    message,
    receivedAt: new Date().toISOString(),
  };

  const webhook =
    process.env.CONTACT_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_CONTACT_WEBHOOK_URL;

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: "Could not deliver your message. Please call us instead." },
          { status: 502 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not deliver your message. Please call us instead." },
        { status: 502 },
      );
    }
  } else {
    console.info("[contact enquiry]", payload);
  }

  return NextResponse.json({ ok: true });
}
