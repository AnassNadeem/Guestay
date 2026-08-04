import {
  adminCorsPreflight,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import { sendStaffHelpRequestEmail } from "@/lib/mail/staff";

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

type Body = { email?: string; message?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Public: staff on the login page asks an admin for password help.
 * Emails hello@guestay.pk with a high-priority subject.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonWithAdminCors(req, { error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !isValidEmail(email)) {
    return jsonWithAdminCors(
      req,
      { error: "A valid email is required" },
      { status: 400 },
    );
  }

  const mail = await sendStaffHelpRequestEmail({
    staffEmail: email,
    message: body.message?.trim(),
  });

  if (!mail.ok) {
    return jsonWithAdminCors(
      req,
      { error: mail.error || "Could not send help request" },
      { status: 502 },
    );
  }

  return jsonWithAdminCors(req, {
    ok: true,
    message: "Help request sent to the admin team.",
  });
}
