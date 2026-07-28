import type { AuthProvider } from "@refinedev/core";
import { supabase } from "../supabase";

const DEMO_USERS = [
  {
    email: "owner@guestay.test",
    password: "OwnerDemo#2026",
    role: "owner",
    name: "Owner Demo",
  },
  {
    email: "manager@guestay.test",
    password: "ManagerDemo#2026",
    role: "manager",
    name: "Manager Demo",
  },
] as const;

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    // Dev seed path when Supabase not configured
    const demo = DEMO_USERS.find(
      (u) => u.email === email && u.password === password,
    );
    if (demo && !import.meta.env.VITE_SUPABASE_URL) {
      localStorage.setItem(
        "guestay_admin_user",
        JSON.stringify({ email: demo.email, role: demo.role, name: demo.name }),
      );
      return { success: true, redirectTo: "/" };
    }

    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { success: false, error };
      return { success: true, redirectTo: "/" };
    }

    if (demo) {
      localStorage.setItem(
        "guestay_admin_user",
        JSON.stringify({ email: demo.email, role: demo.role, name: demo.name }),
      );
      return { success: true, redirectTo: "/" };
    }

    return {
      success: false,
      error: { name: "LoginError", message: "Invalid credentials" },
    };
  },
  logout: async () => {
    localStorage.removeItem("guestay_admin_user");
    await supabase?.auth.signOut();
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    if (localStorage.getItem("guestay_admin_user")) {
      return { authenticated: true };
    }
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return { authenticated: true };
    }
    return { authenticated: false, redirectTo: "/login", logout: true };
  },
  getIdentity: async () => {
    const raw = localStorage.getItem("guestay_admin_user");
    if (raw) {
      const u = JSON.parse(raw) as { email: string; name: string; role: string };
      return { id: u.email, name: u.name, email: u.email, role: u.role };
    }
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        return {
          id: user.id,
          name: (user.user_metadata?.full_name as string) || user.email,
          email: user.email,
        };
      }
    }
    return null;
  },
  getPermissions: async () => {
    const raw = localStorage.getItem("guestay_admin_user");
    if (raw) return (JSON.parse(raw) as { role: string }).role;
    return "manager";
  },
  onError: async (error) => ({ error }),
};
