import type { AuthProvider } from "@refinedev/core";
import { supabase } from "../supabase";

type StaffProfile = {
  role: string;
  full_name?: string | null;
  email?: string | null;
  is_suspended?: boolean | null;
};

async function loadStaffProfile(userId: string): Promise<StaffProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name, email, is_suspended")
    .eq("id", userId)
    .maybeSingle();
  return data as StaffProfile | null;
}

function isStaffRole(role: string | undefined | null): boolean {
  return role === "owner" || role === "manager";
}

async function touchLastLogin(userId: string) {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);
}

export const authProvider: AuthProvider = {
  login: async ({ email, password, redirectTo }) => {
    if (!supabase) {
      return {
        success: false,
        error: {
          name: "ConfigError",
          message: "Supabase is not configured for admin login",
        },
      };
    }

    const trimmedEmail = String(email || "").trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return {
        success: false,
        error: {
          name: "ValidationError",
          message: "Email and password are required",
        },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) return { success: false, error };

    const profile = data.user ? await loadStaffProfile(data.user.id) : null;
    const role = profile?.role || "guest";

    if (!isStaffRole(role)) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          name: "Forbidden",
          message: "This account is not staff. Admin or manager role required.",
        },
      };
    }

    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          name: "Forbidden",
          message: "This account has been deactivated. Contact an admin.",
        },
      };
    }

    if (data.user) {
      void touchLastLogin(data.user.id);
    }

    const safeRedirect =
      typeof redirectTo === "string" &&
      redirectTo.startsWith("/") &&
      !redirectTo.startsWith("//")
        ? redirectTo
        : "/";

    return { success: true, redirectTo: safeRedirect };
  },
  logout: async () => {
    await supabase?.auth.signOut();
    localStorage.removeItem("guestay_admin_user");
    localStorage.removeItem("guestay_admin_idle_reset");
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    if (!supabase) {
      return { authenticated: false, redirectTo: "/login", logout: true };
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      return { authenticated: false, redirectTo: "/login", logout: true };
    }
    const profile = await loadStaffProfile(data.session.user.id);
    if (!isStaffRole(profile?.role) || profile?.is_suspended) {
      await supabase.auth.signOut();
      return { authenticated: false, redirectTo: "/login", logout: true };
    }
    return { authenticated: true };
  },
  getIdentity: async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const profile = await loadStaffProfile(user.id);
    return {
      id: user.id,
      name: profile?.full_name || user.email,
      email: profile?.email || user.email,
      role: profile?.role || "manager",
    };
  },
  getPermissions: async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const profile = await loadStaffProfile(data.user.id);
    return profile?.role || null;
  },
  onError: async (error) => ({ error }),
};
