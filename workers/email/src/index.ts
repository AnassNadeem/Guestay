/**
 * Cloudflare Worker: Zoho SMTP booking emails
 * Deploy: cd workers/email && npx wrangler deploy
 *
 * Secrets: ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, ZOHO_SMTP_USER, ZOHO_SMTP_PASS, ZOHO_FROM_EMAIL
 */

export interface Env {
  ZOHO_SMTP_HOST: string;
  ZOHO_SMTP_PORT: string;
  ZOHO_SMTP_USER: string;
  ZOHO_SMTP_PASS: string;
  ZOHO_FROM_EMAIL: string;
  ZOHO_FROM_NAME?: string;
}

type MailBody = {
  to: string;
  template: string;
  payload: Record<string, unknown>;
};

function render(template: string, payload: Record<string, unknown>) {
  if (template === "booking_confirmation") {
    const ref = String(payload.reference || "");
    return {
      subject: `Guestay booking ${ref}`,
      text: `Your Guestay booking ${ref} is confirmed.\n\nCheck-in details will follow. Set your password via the magic link emailed separately when Auth is enabled.\n\n— Guestay`,
    };
  }
  if (template === "payment_due") {
    return {
      subject: "Guestay — payment due reminder",
      text: `A payment is due for your stay. Reference: ${payload.reference || ""}.\n\n— Guestay`,
    };
  }
  return {
    subject: "Guestay",
    text: JSON.stringify(payload),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const body = (await request.json()) as MailBody;
    const mail = render(body.template, body.payload || {});

    // Workers cannot open raw SMTP sockets easily without a relay.
    // Prefer Email Routing / Mailchannels / or call a small Node relay.
    // Here we accept the payload and log; production should bind a mail provider.
    console.log("email_outbox", {
      to: body.to,
      from: env.ZOHO_FROM_EMAIL,
      ...mail,
    });

    return Response.json({
      ok: true,
      queued: true,
      note: "Configure Mailchannels or an SMTP relay Worker binding for Zoho delivery.",
    });
  },
};
