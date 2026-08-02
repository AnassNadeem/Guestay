import type { AuthProvider } from "@refinedev/core";
import { supabase } from "../supabase";

async function loadProfileRole(userId: string): Promise<string> {
  if (!supabase) return "manager";
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as string) || "manager";
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (!supabase) {
      return {
        success: false,
        error: {
          name: "ConfigError",
          message: "Supabase is not configured for admin login",
        },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { success: false, error };

    const role = data.user ? await loadProfileRole(data.user.id) : "guest";
    if (role !== "owner" && role !== "manager") {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          name: "Forbidden",
          message: "This account is not staff. Owner/manager role required.",
        },
      };
    }

    return { success: true, redirectTo: "/" };
  },
  logout: async () => {
    await supabase?.auth.signOut();
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
    const role = await loadProfileRole(data.session.user.id);
    if (role !== "owner" && role !== "manager") {
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();
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
    return loadProfileRole(data.user.id);
  },
  onError: async (error) => ({ error }),
};
