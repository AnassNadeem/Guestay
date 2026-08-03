import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

function smtpConfigured() {
  return Boolean(
    process.env.ZOHO_SMTP_HOST &&
      process.env.ZOHO_SMTP_USER &&
      process.env.ZOHO_SMTP_PASS,
  );
}

/** Reused across requests so we skip TLS + login on every send. */
let pooledTransport: Transporter | null = null;

function getZohoTransport() {
  if (pooledTransport) return pooledTransport;

  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  pooledTransport = nodemailer.createTransport({
    pool: true,
    host: process.env.ZOHO_SMTP_HOST,
    port,
    secure: port === 465,
    maxConnections: 1,
    maxMessages: 100,
    auth: {
      user: process.env.ZOHO_SMTP_USER,
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });

  return pooledTransport;
}

export type ContactEnquiryMail = {
  name: string;
  email: string;
  phone: string;
  roomType: string;
  message: string;
  receivedAt: string;
};

/**
 * Sends a contact-form enquiry to hello@guestay.pk (or CONTACT_TO_EMAIL).
 * Uses Zoho SMTP; bookings@ stays for booking mail only.
 */
export async function sendContactEnquiryEmail(
  enquiry: ContactEnquiryMail,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!smtpConfigured()) {
    return {
      ok: false,
      error: "Email is not configured on the server.",
    };
  }

  const to =
    process.env.CONTACT_TO_EMAIL ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    "hello@guestay.pk";

  // Zoho only allows sending as the authenticated mailbox (or its aliases).
  const fromEmail = process.env.ZOHO_SMTP_USER!;
  const fromName = process.env.ZOHO_FROM_NAME || "Guestay";

  const roomLabel =
    enquiry.roomType === "shared"
      ? "Shared Rooms"
      : enquiry.roomType === "personal"
        ? "Full Personal Room"
        : enquiry.roomType === "flat"
          ? "Full 2-Bedroom Flats"
          : enquiry.roomType || "Not specified";

  const subject = `[Contact form] Enquiry from ${enquiry.name}`;
  const text = [
    "New enquiry from the Guestay Contact Us form.",
    "",
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone || "—"}`,
    `Room type: ${roomLabel}`,
    `Received: ${enquiry.receivedAt}`,
    "",
    "Message:",
    enquiry.message,
  ].join("\n");

  try {
    const transport = getZohoTransport();
    await transport.sendMail({
      from: `"${fromName} Contact Form" <${fromEmail}>`,
      to,
      replyTo: `"${enquiry.name}" <${enquiry.email}>`,
      subject,
      text,
      headers: {
        "X-Guestay-Source": "contact-form",
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[contact email]", err);
    // Drop broken pool so the next attempt opens a fresh connection
    try {
      pooledTransport?.close();
    } catch {
      /* ignore */
    }
    pooledTransport = null;
    return {
      ok: false,
      error: "Could not deliver your message. Please call us instead.",
    };
  }
}

/**
 * Queue the send and return immediately — UI stays snappy.
 * On Cloudflare Workers, use waitUntil so the isolate stays alive for SMTP.
 * On local Next, fire-and-forget is fine.
 */
export async function queueContactEnquiryEmail(
  enquiry: ContactEnquiryMail,
): Promise<void> {
  const promise = sendContactEnquiryEmail(enquiry).then((result) => {
    if (!result.ok) {
      console.error("[contact] background send failed:", result.error, {
        name: enquiry.name,
        email: enquiry.email,
      });
    } else {
      console.info("[contact] background send ok", {
        name: enquiry.name,
        email: enquiry.email,
      });
    }
  });

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { ctx } = getCloudflareContext();
    ctx.waitUntil(promise);
  } catch {
    void promise;
  }
}

export function isSmtpConfigured() {
  return smtpConfigured();
}
