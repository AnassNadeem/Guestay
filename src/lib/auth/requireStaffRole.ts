import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export type StaffRole = "owner" | "manager";

export type StaffAuth =
  | { ok: true; userId: string; role: StaffRole; email: string | null }
  | { ok: false; response: NextResponse };

/**
 * Require a real Supabase session whose profiles.role is in allowedRoles.
 * Matches the existing Bearer JWT convention used by sessionUserIdFromRequest.
 * Never trusts client-supplied role headers.
 */
export async function requireStaffRole(
  req: Request,
  allowedRoles: readonly StaffRole[],
): Promise<StaffAuth> {
  if (!hasSupabase()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 },
      ),
    };
  }

  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = auth.slice(7).trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const sb = createServiceSupabase();
    const { data: userData, error: userError } = await sb.auth.getUser(token);
    if (userError || !userData.user) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile?.role) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    if (profile.is_suspended) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Account deactivated" },
          { status: 403 },
        ),
      };
    }

    const role = profile.role as string;
    if (role !== "owner" && role !== "manager") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    if (!allowedRoles.includes(role)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      ok: true,
      userId: userData.user.id,
      role,
      email: userData.user.email ?? null,
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
