"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Client-side OAuth / email-confirm callback.
 * Exchanges ?code= using the PKCE verifier in localStorage.
 * Guarded against React Strict Mode double-mount (dev).
 */
function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const nextRaw = params.get("next") ?? "/account";
    const next = nextRaw.startsWith("/") ? nextRaw : "/account";
    const code = params.get("code");
    const oauthError = params.get("error_description") || params.get("error");

    async function go(path: string) {
      router.replace(path);
      router.refresh();
    }

    async function finish() {
      if (oauthError) {
        await go(
          `/login?error=auth&reason=${encodeURIComponent(oauthError)}`,
        );
        return;
      }

      if (!hasSupabase()) {
        await go("/login?error=auth&reason=supabase_missing");
        return;
      }

      const supabase = createBrowserSupabase();

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setMessage("Success — redirecting…");
          await go(next);
          return;
        }

        // Strict Mode / double submit: code already exchanged — session may exist
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setMessage("Already signed in — redirecting…");
          await go(next);
          return;
        }

        setMessage("Sign-in failed. Redirecting…");
        await go(
          `/login?error=auth&reason=${encodeURIComponent(error.message.slice(0, 80))}`,
        );
        return;
      }

      const hash = window.location.hash.replace(/^#/, "");
      if (hash.includes("access_token")) {
        const h = new URLSearchParams(hash);
        const access_token = h.get("access_token");
        const refresh_token = h.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (!error) {
            window.history.replaceState(null, "", next);
            await go(next);
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await go(next);
        return;
      }

      await go("/login?error=auth&reason=missing_code");
    }

    void finish();
  }, [params, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-ink-muted">
      {message}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-ink-muted">
          Signing you in…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
