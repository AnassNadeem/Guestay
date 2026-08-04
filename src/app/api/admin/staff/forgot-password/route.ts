import {
  adminCorsPreflight,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import {
  createSetPasswordToken,
  setPasswordLink,
} from "@/lib/auth/set-password-token";
import { sendStaffPasswordResetEmail } from "@/lib/mail/staff";
import { getSiteUrl } from "@/lib/site-url";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

type Body = { email?: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Public (CORS) endpoint: staff forgot-password.
 * Always returns a generic success to avoid email enumeration.
 */
export async function POST(req: Request) {
  if (!hasSupabase()) {
    return jsonWithAdminCors(
      req,
      { error: "Service unavailable" },
      { status: 503 },
    );
  }

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

  const sb = createServiceSupabase();
  const { data: profile } = await sb
    .from("profiles")
    .select("id, email, full_name, role, is_suspended")
    .eq("email", email)
    .maybeSingle();

  const isStaff =
    profile &&
    (profile.role === "owner" || profile.role === "manager") &&
    !profile.is_suspended;

  if (isStaff) {
    const pwToken = createSetPasswordToken();
    const adminUrl = (
      process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.guestay.pk"
    ).replace(/\/$/, "");
    const siteUrl = getSiteUrl(req);
    const setPasswordUrl = `${setPasswordLink({
      siteUrl,
      email,
      token: pwToken.token,
    })}&for=staff`;

    const { data: authUser } = await sb.auth.admin.getUserById(profile.id);
    if (authUser?.user) {
      await sb.auth.admin.updateUserById(profile.id, {
        user_metadata: {
          ...authUser.user.user_metadata,
          guestay_unclaimed: true,
          guestay_staff_invite: true,
          guestay_set_password_hash: pwToken.hash,
          guestay_set_password_expires: pwToken.expiresAt,
        },
      });
    }

    const mail = await sendStaffPasswordResetEmail({
      to: email,
      fullName: profile.full_name || email.split("@")[0],
      setPasswordUrl,
      adminUrl,
    });

    if (!mail.ok) {
      return jsonWithAdminCors(
        req,
        {
          ok: false,
          error:
            "Could not send the reset email. Please try Contact Admin instead.",
        },
        { status: 502 },
      );
    }
  }

  return jsonWithAdminCors(req, {
    ok: true,
    message:
      "If that email belongs to a staff account, a reset link has been sent.",
  });
}
