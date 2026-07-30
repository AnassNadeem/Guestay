"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Recovers OAuth sessions when tokens land in the URL hash
 * (#access_token=…). Normal PKCE returns ?code= to /auth/callback instead.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw.includes("access_token") || !hasSupabase()) return;

    const params = new URLSearchParams(raw);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = createBrowserSupabase();
    void supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          console.error("[AuthHashHandler]", error.message);
          return;
        }
        window.history.replaceState(null, "", "/account");
        router.replace("/account");
        router.refresh();
      });
  }, [router]);

  return null;
}
