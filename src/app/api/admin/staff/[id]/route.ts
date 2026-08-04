import { requireStaffRole } from "@/lib/auth/requireStaffRole";
import {
  adminCorsPreflight,
  applyAdminCors,
  jsonWithAdminCors,
} from "@/lib/auth/adminCors";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";

type Ctx = { params: Promise<{ id: string }> };

export async function OPTIONS(req: Request) {
  return adminCorsPreflight(req);
}

type PatchBody = {
  email?: string;
  fullName?: string | null;
  phone?: string | null;
  role?: string;
  status?: "active" | "suspended" | "inactive";
  isSuspended?: boolean;
};

function normalizeRole(raw: unknown): "owner" | "manager" | null {
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

/**
 * Owner-only: update staff profile fields / active status.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffRole(req, ["owner"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  if (!hasSupabase()) {
    return jsonWithAdminCors(
      req,
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return jsonWithAdminCors(req, { error: "Missing id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return jsonWithAdminCors(req, { error: "Invalid JSON" }, { status: 400 });
  }

  const sb = createServiceSupabase();
  const { data: existing, error: loadErr } = await sb
    .from("profiles")
    .select("id, email, role, is_suspended, full_name, phone, last_login_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !existing) {
    return jsonWithAdminCors(req, { error: "User not found" }, { status: 404 });
  }

  if (existing.role !== "owner" && existing.role !== "manager") {
    return jsonWithAdminCors(
      req,
      { error: "Not a staff user" },
      { status: 400 },
    );
  }

  // Prevent demoting / suspending the last active owner
  if (existing.role === "owner") {
    const demoting =
      (body.role !== undefined && normalizeRole(body.role) === "manager") ||
      body.status === "suspended" ||
      body.status === "inactive" ||
      body.isSuspended === true;

    if (demoting) {
      const { count } = await sb
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("is_suspended", false);
      if ((count ?? 0) <= 1) {
        return jsonWithAdminCors(
          req,
          { error: "Cannot deactivate or demote the last active admin" },
          { status: 400 },
        );
      }
    }
  }

  if (id === auth.userId) {
    if (
      body.status === "suspended" ||
      body.status === "inactive" ||
      body.isSuspended === true
    ) {
      return jsonWithAdminCors(
        req,
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.fullName !== undefined) patch.full_name = body.fullName?.trim() || null;
  if (body.phone !== undefined) patch.phone = body.phone?.trim() || null;
  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return jsonWithAdminCors(req, { error: "Invalid email" }, { status: 400 });
    }
    patch.email = email;
    const { error: authEmailErr } = await sb.auth.admin.updateUserById(id, {
      email,
    });
    if (authEmailErr) {
      return jsonWithAdminCors(
        req,
        { error: authEmailErr.message || "Could not update email" },
        { status: 500 },
      );
    }
  }
  if (body.role !== undefined) {
    const role = normalizeRole(body.role);
    if (!role) {
      return jsonWithAdminCors(
        req,
        { error: "Role must be admin or manager" },
        { status: 400 },
      );
    }
    patch.role = role;
  }
  if (body.status !== undefined || body.isSuspended !== undefined) {
    const suspended =
      body.isSuspended === true ||
      body.status === "suspended" ||
      body.status === "inactive";
    patch.is_suspended = suspended;
  }

  const { data, error } = await sb
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(
      "id, email, full_name, phone, role, is_suspended, last_login_at, created_at",
    )
    .single();

  if (error || !data) {
    return jsonWithAdminCors(
      req,
      { error: error?.message || "Update failed" },
      { status: 500 },
    );
  }

  return jsonWithAdminCors(req, {
    ok: true,
    user: {
      id: data.id,
      email: data.email,
      name: data.full_name || data.email,
      phone: data.phone,
      role: data.role,
      status: data.is_suspended ? "inactive" : "active",
      lastLogin: data.last_login_at,
      createdAt: data.created_at,
    },
  });
}

/**
 * Owner-only: remove a staff user.
 * - If the profile has guest bookings/refunds (same account used on the storefront),
 *   demote role to `guest` so booking history stays intact and they leave the Users list.
 * - Otherwise hard-delete auth + profile.
 */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await requireStaffRole(req, ["owner"]);
    if (!auth.ok) return applyAdminCors(req, auth.response);

    if (!hasSupabase()) {
      return jsonWithAdminCors(
        req,
        { error: "Supabase is not configured" },
        { status: 503 },
      );
    }

    const { id } = await ctx.params;
    if (!id) {
      return jsonWithAdminCors(req, { error: "Missing id" }, { status: 400 });
    }

    if (id === auth.userId) {
      return jsonWithAdminCors(
        req,
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    const sb = createServiceSupabase();
    const { data: existing } = await sb
      .from("profiles")
      .select("id, email, role, is_suspended")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return jsonWithAdminCors(req, { error: "User not found" }, { status: 404 });
    }

    if (existing.role !== "owner" && existing.role !== "manager") {
      return jsonWithAdminCors(
        req,
        { error: "Not a staff user" },
        { status: 400 },
      );
    }

    if (existing.role === "owner") {
      const { count } = await sb
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("is_suspended", false)
        .neq("id", id);
      if ((count ?? 0) < 1 && !existing.is_suspended) {
        return jsonWithAdminCors(
          req,
          { error: "Cannot remove the last active admin" },
          { status: 400 },
        );
      }
    }

    // Same auth profile may also be a storefront guest with booking history.
    const [{ count: bookingRefs }, { count: refundRefs }, { count: orderRefs }] =
      await Promise.all([
        sb
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .or(`guest_id.eq.${id},created_by.eq.${id}`),
        sb
          .from("refund_requests")
          .select("id", { count: "exact", head: true })
          .or(`guest_id.eq.${id},decided_by.eq.${id}`),
        sb
          .from("booking_orders")
          .select("id", { count: "exact", head: true })
          .eq("guest_id", id),
      ]);

    const linked =
      (bookingRefs ?? 0) + (refundRefs ?? 0) + (orderRefs ?? 0);

    if (linked > 0) {
      // Keep the account for guest history; just revoke staff access.
      const { error: demoteErr } = await sb
        .from("profiles")
        .update({
          role: "guest",
          is_suspended: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (demoteErr) {
        return jsonWithAdminCors(
          req,
          { error: demoteErr.message || "Could not remove staff access" },
          { status: 500 },
        );
      }

      await sb.auth.admin.updateUserById(id, {
        user_metadata: {
          guestay_staff_invite: false,
          guestay_unclaimed: false,
        },
      });

      return jsonWithAdminCors(req, {
        ok: true,
        id,
        demoted: true,
        message:
          "Removed from staff. This account also has guest bookings, so it was kept as a guest account.",
      });
    }

    const { error: delAuthErr } = await sb.auth.admin.deleteUser(id);
    if (delAuthErr) {
      const msg =
        delAuthErr.message ||
        (delAuthErr as { error_description?: string }).error_description ||
        "Could not delete auth user";
      if (/foreign key|violates|restrict|reference/i.test(msg)) {
        // Fallback: demote instead of failing hard.
        const { error: demoteErr } = await sb
          .from("profiles")
          .update({
            role: "guest",
            is_suspended: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (demoteErr) {
          return jsonWithAdminCors(req, { error: msg }, { status: 500 });
        }
        return jsonWithAdminCors(req, {
          ok: true,
          id,
          demoted: true,
          message:
            "Removed from staff. The account was kept because other records still reference it.",
        });
      }
      return jsonWithAdminCors(req, { error: msg }, { status: 500 });
    }

    const { error: delProfileErr } = await sb
      .from("profiles")
      .delete()
      .eq("id", id);
    if (delProfileErr) {
      return jsonWithAdminCors(
        req,
        {
          error:
            delProfileErr.message ||
            "Auth user removed but profile cleanup failed. Refresh and check the list.",
        },
        { status: 500 },
      );
    }

    return jsonWithAdminCors(req, {
      ok: true,
      id,
      deleted: true,
      message: "User permanently deleted",
    });
  } catch (err) {
    console.error("[admin/staff DELETE]", err);
    return jsonWithAdminCors(
      req,
      {
        error:
          err instanceof Error ? err.message : "Unexpected delete failure",
      },
      { status: 500 },
    );
  }
}

/** Owner-only: fetch one staff user with full detail. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireStaffRole(req, ["owner"]);
  if (!auth.ok) return applyAdminCors(req, auth.response);

  if (!hasSupabase()) {
    return jsonWithAdminCors(
      req,
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const sb = createServiceSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, is_suspended, last_login_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return jsonWithAdminCors(req, { error: "User not found" }, { status: 404 });
  }

  if (data.role !== "owner" && data.role !== "manager") {
    return jsonWithAdminCors(req, { error: "Not a staff user" }, { status: 400 });
  }

  return jsonWithAdminCors(req, {
    user: {
      id: data.id,
      email: data.email,
      name: data.full_name || data.email,
      phone: data.phone,
      role: data.role,
      status: data.is_suspended ? "inactive" : "active",
      lastLogin: data.last_login_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}
