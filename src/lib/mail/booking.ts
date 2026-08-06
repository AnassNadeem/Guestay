import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSiteUrl } from "@/lib/site-url";
import { formatCurrency, formatDateLabel } from "@/lib/utils";

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

function bookingsFrom() {
  const email =
    process.env.ZOHO_FROM_EMAIL ||
    process.env.ZOHO_SMTP_USER ||
    "bookings@guestay.pk";
  const name = process.env.ZOHO_FROM_NAME || "Guestay Bookings";
  return { email, name };
}

function noreplyFrom() {
  const email = process.env.NOREPLY_FROM_EMAIL || "noreply@guestay.pk";
  const name = process.env.NOREPLY_FROM_NAME || "Guestay";
  return { email, name };
}

function siteUrl() {
  return getSiteUrl();
}

async function sendWithZoho(opts: {
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  headers: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!smtpConfigured()) {
    return { ok: false, error: "Email is not configured on the server." };
  }
  try {
    const transport = getZohoTransport();
    await transport.sendMail({
      from: `"${opts.fromName}" <${opts.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      headers: opts.headers,
    });
    return { ok: true };
  } catch (err) {
    console.error("[mail] Zoho send failed", err, { to: opts.to });
    try {
      pooledTransport?.close();
    } catch {
      /* ignore */
    }
    pooledTransport = null;
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Send failed",
    };
  }
}

/**
 * Prefer Resend for noreply@ (matches Supabase Auth SMTP setup).
 * Falls back to Zoho if noreply is an alias on the bookings mailbox.
 */
export async function sendNoreplyMail(opts: {
  to: string;
  subject: string;
  text: string;
  headers: Record<string, string>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { email: fromEmail, name: fromName } = noreplyFrom();
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (apiKey && !apiKey.includes("YOUR_")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [opts.to],
          subject: opts.subject,
          text: opts.text,
          headers: opts.headers,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[noreply mail] Resend failed", res.status, detail);
        return {
          ok: false,
          error: `Resend ${res.status}: ${detail.slice(0, 200)}`,
        };
      }
      return { ok: true };
    } catch (err) {
      console.error("[noreply mail] Resend error", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Resend failed",
      };
    }
  }

  // Zoho fallback — from must be the SMTP user or an allowed alias
  return sendWithZoho({
    fromEmail,
    fromName,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    headers: opts.headers,
  });
}

export type AccountLinkScenario =
  | "logged_in"
  | "existing_claimed"
  | "new_or_unclaimed";

export type BookingMailRoom = {
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  bookingMode?: string;
};

export type BookingConfirmationMail = {
  to: string;
  guestName: string;
  reference: string;
  rooms: BookingMailRoom[];
  amountPaidPkr: number;
  amountDuePkr: number;
  status: string;
  scenario: AccountLinkScenario;
  paidAt?: string;
};

const SAFETY_LINE =
  "If you don't recognize this booking, contact us at bookings@guestay.pk";

function roomLines(rooms: BookingMailRoom[]): string[] {
  return rooms.flatMap((r, i) => {
    const label = rooms.length > 1 ? `Room ${i + 1}: ${r.roomName}` : r.roomName;
    return [
      label,
      `  Dates: ${r.checkIn} → ${r.checkOut}`,
      `  Guests: ${r.guests}`,
    ];
  });
}

/**
 * Booking confirmation from bookings@guestay.pk.
 * No set-password / magic link — that goes in a separate noreply email.
 */
export async function sendBookingConfirmationEmail(
  mail: BookingConfirmationMail,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!smtpConfigured()) {
    console.warn("[booking email] SMTP not configured — skipped", {
      reference: mail.reference,
      to: mail.to,
    });
    return { ok: false, error: "Email is not configured on the server." };
  }

  const { email: fromEmail, name: fromName } = bookingsFrom();
  const signupUrl = `${siteUrl()}/login?mode=signup`;
  const loginUrl = `${siteUrl()}/login`;
  const accountUrl = `${siteUrl()}/account`;

  let accountBlock = "";
  if (mail.scenario === "new_or_unclaimed") {
    accountBlock = [
      "",
      "Access your booking in My Account after you create your Guestay account:",
      signupUrl,
      "",
      "We've sent a separate email from noreply@guestay.pk with your account creation link (set a password — expires in 24 hours, does not sign you in automatically).",
    ].join("\n");
  } else if (mail.scenario === "existing_claimed") {
    accountBlock = [
      "",
      "Access this booking in My Account:",
      loginUrl,
    ].join("\n");
  } else if (mail.scenario === "logged_in") {
    accountBlock = [
      "",
      "Access this booking in My Account:",
      accountUrl,
    ].join("\n");
  }

  const subject = `Guestay booking confirmed — ${mail.reference}`;
  const text = [
    `Hi ${mail.guestName},`,
    "",
    `Your booking ${mail.reference} is confirmed.`,
    "",
    ...roomLines(mail.rooms),
    "",
    `Amount paid: ${formatCurrency(mail.amountPaidPkr)}`,
    mail.paidAt && mail.amountPaidPkr > 0
      ? `Paid on: ${formatDateLabel(mail.paidAt)}`
      : null,
    `Still due: ${formatCurrency(mail.amountDuePkr)}`,
    `Status: ${mail.status}`,
    "",
    "Check-in: please bring a valid government ID for each guest. Our team will share arrival details closer to your stay.",
    accountBlock,
    "",
    SAFETY_LINE,
    "",
    "— Guestay",
    "bookings@guestay.pk",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return sendWithZoho({
    fromEmail,
    fromName,
    to: mail.to,
    subject,
    text,
    headers: {
      "X-Guestay-Source": "booking-confirmation",
      "X-Guestay-Reference": mail.reference,
    },
  });
}

export type InternalBookingNotify = {
  reference: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  rooms: BookingMailRoom[];
  amountPaidPkr: number;
  amountDuePkr: number;
  status: string;
  paidAt?: string;
};

/**
 * Short internal ops email. Requires INTERNAL_NOTIFICATION_EMAIL.
 * Failures never block the booking.
 */
export async function sendInternalBookingNotification(
  mail: InternalBookingNotify,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = process.env.INTERNAL_NOTIFICATION_EMAIL?.trim();
  if (!to) {
    console.warn(
      "[internal notify] INTERNAL_NOTIFICATION_EMAIL not set — skipped",
      { reference: mail.reference },
    );
    return { ok: false, error: "INTERNAL_NOTIFICATION_EMAIL not set" };
  }

  if (!smtpConfigured()) {
    console.warn("[internal notify] SMTP not configured — skipped", {
      reference: mail.reference,
    });
    return { ok: false, error: "Email is not configured on the server." };
  }

  const { email: fromEmail, name: fromName } = bookingsFrom();
  const viewUrl = `${siteUrl()}/booking-confirmed?ref=${encodeURIComponent(mail.reference)}`;

  const subject = `[Guestay] New booking ${mail.reference}`;
  const text = [
    `Booking: ${mail.reference}`,
    `Status: ${mail.status}`,
    `Guest: ${mail.guestName}`,
    `Email: ${mail.guestEmail}`,
    `Phone: ${mail.guestPhone}`,
    "",
    ...roomLines(mail.rooms),
    "",
    `Paid: ${formatCurrency(mail.amountPaidPkr)}`,
    mail.paidAt && mail.amountPaidPkr > 0
      ? `Paid on: ${formatDateLabel(mail.paidAt)}`
      : null,
    `Due: ${formatCurrency(mail.amountDuePkr)}`,
    "",
    `View: ${viewUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return sendWithZoho({
    fromEmail,
    fromName,
    to,
    subject,
    text,
    headers: {
      "X-Guestay-Source": "internal-booking-notify",
      "X-Guestay-Reference": mail.reference,
    },
  });
}

/**
 * Account creation / set-password email from noreply@guestay.pk.
 * Link opens a set-password form — it does not auto-login.
 */
export async function sendAccountSetupEmail(input: {
  to: string;
  guestName: string;
  setPasswordUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const subject = "Set up your Guestay account";
  const text = [
    `Hi ${input.guestName},`,
    "",
    "Create your Guestay account by choosing a password using this link:",
    input.setPasswordUrl,
    "",
    "This link expires in 24 hours and will not sign you in automatically — you'll sign in after setting your password.",
    "",
    "Once your account is ready, open My Account to view and manage your booking.",
    "",
    SAFETY_LINE,
    "",
    "— Guestay",
    "noreply@guestay.pk",
  ].join("\n");

  return sendNoreplyMail({
    to: input.to,
    subject,
    text,
    headers: { "X-Guestay-Source": "account-setup" },
  });
}

/** @deprecated Prefer sendAccountSetupEmail */
export async function sendMagicLinkEmail(input: {
  to: string;
  guestName: string;
  actionLink: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return sendAccountSetupEmail({
    to: input.to,
    guestName: input.guestName,
    setPasswordUrl: input.actionLink,
  });
}

export function isBookingSmtpConfigured() {
  return smtpConfigured();
}

export type RefundDecisionMail = {
  to: string;
  guestName?: string;
  decision: "approve" | "deny";
  amountPkr?: number;
  ownerNote?: string;
  reference?: string;
  ticketId?: string;
};

/**
 * Guest-facing refund decision email (approve or deny).
 * Same Zoho SMTP path as booking confirmations — not the retired email worker.
 */
export async function sendRefundDecisionEmail(
  mail: RefundDecisionMail,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!smtpConfigured()) {
    console.warn("[refund email] SMTP not configured — skipped", {
      decision: mail.decision,
      to: mail.to,
      ticketId: mail.ticketId,
    });
    return { ok: false, error: "Email is not configured on the server." };
  }

  const { email: fromEmail, name: fromName } = bookingsFrom();
  const name = mail.guestName?.trim() || "there";
  const amountLine =
    typeof mail.amountPkr === "number" && mail.amountPkr > 0
      ? `Amount: ${formatCurrency(mail.amountPkr)}`
      : null;
  const refLine = mail.reference
    ? `Booking reference: ${mail.reference}`
    : null;

  if (mail.decision === "deny") {
    const subject = "Guestay — refund request update";
    const text = [
      `Hi ${name},`,
      "",
      "We've reviewed your refund request and are unable to approve it at this time.",
      refLine,
      amountLine,
      mail.ownerNote ? "" : null,
      mail.ownerNote ? `Note from our team: ${mail.ownerNote}` : null,
      "",
      "If you have questions, reply to this email or contact bookings@guestay.pk.",
      "",
      SAFETY_LINE,
      "",
      "— Guestay",
      "bookings@guestay.pk",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    return sendWithZoho({
      fromEmail,
      fromName,
      to: mail.to,
      subject,
      text,
      headers: {
        "X-Guestay-Source": "refund-denied",
        ...(mail.ticketId ? { "X-Guestay-Ticket": mail.ticketId } : {}),
      },
    });
  }

  const subject = "Guestay — refund approved, processing";
  const text = [
    `Hi ${name},`,
    "",
    "Your refund request has been approved and is being processed.",
    "Funds are returned via the original payment method; timing depends on your bank.",
    refLine,
    amountLine,
    mail.ownerNote ? "" : null,
    mail.ownerNote ? `Note from our team: ${mail.ownerNote}` : null,
    "",
    "Questions? Contact bookings@guestay.pk.",
    "",
    SAFETY_LINE,
    "",
    "— Guestay",
    "bookings@guestay.pk",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return sendWithZoho({
    fromEmail,
    fromName,
    to: mail.to,
    subject,
    text,
    headers: {
      "X-Guestay-Source": "refund-approved",
      ...(mail.ticketId ? { "X-Guestay-Ticket": mail.ticketId } : {}),
    },
  });
}
