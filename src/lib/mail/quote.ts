import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

function smtpConfigured() {
  return Boolean(
    process.env.ZOHO_SMTP_HOST &&
      process.env.ZOHO_SMTP_USER &&
      process.env.ZOHO_SMTP_PASS,
  );
}

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

export type QuoteRequestMail = {
  name: string;
  email: string;
  phone: string;
  roomType?: string | null;
  approxRoomsOrGuests?: string | null;
  approxMoveIn?: string | null;
  approxDuration?: string | null;
  notes?: string | null;
};

/** Notify ops that a long-term quote lead landed. */
export async function sendQuoteRequestNotification(
  lead: QuoteRequestMail,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = process.env.INTERNAL_NOTIFICATION_EMAIL?.trim();
  if (!to) {
    console.warn(
      "[quote] INTERNAL_NOTIFICATION_EMAIL not set — skipped notify",
    );
    return { ok: false, error: "INTERNAL_NOTIFICATION_EMAIL not set" };
  }
  if (!smtpConfigured()) {
    return { ok: false, error: "Email is not configured on the server." };
  }

  const fromEmail =
    process.env.ZOHO_FROM_EMAIL ||
    process.env.ZOHO_SMTP_USER ||
    "bookings@guestay.pk";
  const text = [
    `[Guestay] New quote request from ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Room type: ${lead.roomType || "—"}`,
    `Rooms/guests: ${lead.approxRoomsOrGuests || "—"}`,
    `Move-in: ${lead.approxMoveIn || "—"}`,
    `Duration: ${lead.approxDuration || "—"}`,
    `Notes: ${lead.notes || "—"}`,
  ].join("\n");

  try {
    await getZohoTransport().sendMail({
      from: `"Guestay Quotes" <${fromEmail}>`,
      to,
      subject: `[Guestay] Quote request — ${lead.name}`,
      text,
      replyTo: lead.email,
    });
    return { ok: true };
  } catch (err) {
    console.error("[quote] notify failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}
