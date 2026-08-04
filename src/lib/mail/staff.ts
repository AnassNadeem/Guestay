import { sendNoreplyMail } from "@/lib/mail/booking";

/**
 * Staff invite — set-password email for Admin/Manager accounts.
 */
export async function sendStaffInviteEmail(input: {
  to: string;
  fullName: string;
  roleLabel: string;
  setPasswordUrl: string;
  adminUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const subject = "Set up your Guestay Admin login";
  const text = [
    `Hi ${input.fullName},`,
    "",
    `You have been invited as a Guestay ${input.roleLabel}.`,
    "",
    "Set your login password using this link (expires in 24 hours):",
    input.setPasswordUrl,
    "",
    "After setting your password, sign in at:",
    input.adminUrl,
    "",
    "This link will not sign you in automatically.",
    "",
    "- Guestay",
    "noreply@guestay.pk",
  ].join("\n");

  return sendNoreplyMail({
    to: input.to,
    subject,
    text,
    headers: { "X-Guestay-Source": "staff-invite" },
  });
}

/** Staff forgot-password reset link. */
export async function sendStaffPasswordResetEmail(input: {
  to: string;
  fullName: string;
  setPasswordUrl: string;
  adminUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const subject = "Reset your Guestay Admin password";
  const text = [
    `Hi ${input.fullName},`,
    "",
    "We received a request to reset your Guestay Admin password.",
    "",
    "Reset your password using this link (expires in 24 hours):",
    input.setPasswordUrl,
    "",
    "Then sign in at:",
    input.adminUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "- Guestay",
    "noreply@guestay.pk",
  ].join("\n");

  return sendNoreplyMail({
    to: input.to,
    subject,
    text,
    headers: { "X-Guestay-Source": "staff-password-reset" },
  });
}

/**
 * High-priority staff help request to hello@guestay.pk
 * (e.g. when password reset cannot complete).
 */
export async function sendStaffHelpRequestEmail(input: {
  staffEmail: string;
  message?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to =
    process.env.CONTACT_TO_EMAIL ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    "hello@guestay.pk";

  const subject = `[HIGH PRIORITY STAFF] Password help - ${input.staffEmail}`;
  const text = [
    "A staff member needs help resetting their Guestay Admin password.",
    "",
    `Staff email: ${input.staffEmail}`,
    `Requested at: ${new Date().toISOString()}`,
    "",
    input.message?.trim()
      ? `Message:\n${input.message.trim()}`
      : "No additional message was provided.",
    "",
    "- Guestay Admin Login",
  ].join("\n");

  return sendNoreplyMail({
    to,
    subject,
    text,
    headers: {
      "X-Guestay-Source": "staff-password-help",
      "X-Priority": "1",
      Importance: "high",
    },
  });
}
