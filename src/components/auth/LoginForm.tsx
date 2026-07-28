"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginFormInner() {
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">(
    signup ? "password" : "magic",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!hasSupabase()) {
        setSent(true);
        return;
      }
      const supabase = createBrowserSupabase();
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      if (signup || (mode === "password" && params.get("mode") === "signup")) {
        const { error: err } = await supabase.auth.signUp({
          email,
          password: password || crypto.randomUUID(),
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${site}/account`,
          },
        });
        if (err) throw err;
        setSent(true);
        return;
      }

      if (mode === "password" && password) {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        window.location.href = "/account";
        return;
      }

      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${site}/account` },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-soft bg-white/80 p-6 text-ink-muted">
        Check <strong className="text-ink">{email}</strong> for a magic link
        {signup ? " to finish setting up your account" : ""}.
        {!hasSupabase() && (
          <span className="mt-2 block text-sm">
            Supabase is not configured yet — continue to{" "}
            <a href="/account" className="text-olive underline">
              /account
            </a>
            .
          </span>
        )}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <h1 className="font-display text-2xl text-ink">
        {signup ? "Create Account" : "Sign In"}
      </h1>
      <p className="text-sm text-ink-muted">
        Optional — browsing never requires an account. Checkout creates one
        automatically after a successful booking.
      </p>

      {signup && (
        <label className="block text-sm">
          <span className="text-ink-muted">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 h-11 w-full rounded-soft border border-olive/15 px-3 text-ink"
          />
        </label>
      )}

      <label className="block text-sm">
        <span className="text-ink-muted">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 h-11 w-full rounded-soft border border-olive/15 px-3 text-ink"
        />
      </label>

      {(signup || mode === "password") && (
        <label className="block text-sm">
          <span className="text-ink-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-11 w-full rounded-soft border border-olive/15 px-3 text-ink"
            minLength={8}
            required={signup || mode === "password"}
          />
        </label>
      )}

      {!signup && (
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={mode === "magic" ? "text-olive underline" : "text-ink-muted"}
          >
            Magic link
          </button>
          <span className="text-ink-soft">·</span>
          <button
            type="button"
            onClick={() => setMode("password")}
            className={mode === "password" ? "text-olive underline" : "text-ink-muted"}
          >
            Password
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center rounded-soft bg-olive px-6 text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading
          ? "Please wait…"
          : signup
            ? "Create account"
            : mode === "password"
              ? "Sign in"
              : "Email me a magic link"}
      </button>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
