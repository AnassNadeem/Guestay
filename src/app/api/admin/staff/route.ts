import type { StaffRole } from "@/lib/auth/requireStaffRole";
import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import {
  createSetPasswordToken,
  setPasswordLink,
} from "@/lib/auth/set-password-token";
import { sendStaffInviteEmail } from "@/lib/mail/staff";
import { getSiteUrl } from "@/lib/site-url";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

type InviteBody = {
  email?: string;
  role?: string;
  fullName?: string;
  phone?: string;
};

function normalizeRole(raw: unknown): StaffRole | null {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (v === "owner" || v === "admin") return "owner";
  if (v === "manager") return "manager";
  return null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findAuthUserByEmail(
  sb: ReturnType<typeof createServiceSupabase>,
  email: string,
) {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  return data?.users?.find((u) => u.email?.toLowerCase() === email) ?? null;
}

/**
 * Owner-only: create/invite a staff user and email a set-password link.
 * DB role remains owner|manager (UI labels owner as Admin).
 */
export async function POST(req: Request) {
  const auth = await requireStaffRole(req, ["owner"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  if (!hasSupabase()) {
    return jsonWithAdminCors(
      req,
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return jsonWithAdminCors(req, { error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const role = normalizeRole(body.role);
  const fullName = body.fullName?.trim() || null;
  const phone = body.phone?.trim() || null;

  if (!email || !isValidEmail(email)) {
    return jsonWithAdminCors(
      req,
      { error: "A valid email is required" },
      { status: 400 },
    );
  }
  if (!role) {
    return jsonWithAdminCors(
      req,
      { error: "Role must be admin or manager" },
      { status: 400 },
    );
  }

  const sb = createServiceSupabase();
  const existing = await findAuthUserByEmail(sb, email);
  const pwToken = createSetPasswordToken();
  const adminUrl =
    (process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.guestay.pk").replace(
      /\/$/,
      "",
    );
  const siteUrl = getSiteUrl(req);
  const setPasswordUrl = setPasswordLink({
    siteUrl,
    email,
    token: pwToken.token,
  });
  // Mark staff invites so the set-password success screen links to admin.
  const staffSetPasswordUrl = `${setPasswordUrl}&for=staff`;

  let userId: string;

  if (existing) {
    const { data: profile } = await sb
      .from("profiles")
      .select("id, role")
      .eq("id", existing.id)
      .maybeSingle();

    if (
      profile?.role === "owner" ||
      profile?.role === "manager" ||
      profile?.role === "guest"
    ) {
      // Promote / re-invite existing auth user to staff
      const { error: updErr } = await sb.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
        user_metadata: {
          ...existing.user_metadata,
          full_name: fullName || existing.user_metadata?.full_name,
          guestay_unclaimed: true,
          guestay_staff_invite: true,
          guestay_set_password_hash: pwToken.hash,
          guestay_set_password_expires: pwToken.expiresAt,
        },
      });
      if (updErr) {
        return jsonWithAdminCors(
          req,
          { error: updErr.message || "Could not update user" },
          { status: 500 },
        );
      }
      userId = existing.id;
    } else {
      return jsonWithAdminCors(
        req,
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }
  } else {
    const tempPassword = `Tmp!${pwToken.token.slice(0, 24)}A1`;
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        guestay_unclaimed: true,
        guestay_staff_invite: true,
        guestay_set_password_hash: pwToken.hash,
        guestay_set_password_expires: pwToken.expiresAt,
      },
    });
    if (createErr || !created.user) {
      return jsonWithAdminCors(
        req,
        { error: createErr?.message || "Could not create user" },
        { status: 500 },
      );
    }
    userId = created.user.id;
  }

  const { error: profileErr } = await sb.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      phone,
      role,
      is_suspended: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    return jsonWithAdminCors(
      req,
      { error: profileErr.message || "Could not save profile" },
      { status: 500 },
    );
  }

  const mail = await sendStaffInviteEmail({
    to: email,
    fullName: fullName || email.split("@")[0],
    roleLabel: role === "owner" ? "Admin" : "Manager",
    setPasswordUrl: staffSetPasswordUrl,
    adminUrl,
  });

  if (!mail.ok) {
    return jsonWithAdminCors(
      req,
      {
        ok: true,
        warning: `User created but invite email failed: ${mail.error}`,
        user: { id: userId, email, role },
        setPasswordUrl: staffSetPasswordUrl,
      },
      { status: 201 },
    );
  }

  return jsonWithAdminCors(
    req,
    {
      ok: true,
      user: { id: userId, email, role, fullName, phone },
    },
    { status: 201 },
  );
}
