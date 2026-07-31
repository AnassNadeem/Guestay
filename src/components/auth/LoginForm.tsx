"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const fieldClass =
  "mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-ink outline-none focus:border-olive/40";

function LoginFormInner() {
  const params = useSearchParams();
  const router = useRouter();
  const signup = params.get("mode") === "signup";
  const authError = params.get("error") === "auth";
  const authReason = params.get("reason");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(params.get("email")?.trim() ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authError
      ? authReason
        ? `Sign-in failed (${authReason}). Please try again.`
        : "Sign-in failed. Please try again."
      : null,
  );
  const [loading, setLoading] = useState(false);

  // If OAuth already created a session but an error flash landed here, recover.
  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createBrowserSupabase();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/account");
        router.refresh();
      }
    });
  }, [router]);

  async function continueWithGoogle() {
    setError(null);
    setLoading(true);
    try {
      if (!hasSupabase()) {
        setError("Google Sign-In requires Supabase to be configured.");
        return;
      }
      const supabase = createBrowserSupabase();
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${site}/auth/callback?next=/account`,
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed");
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (signup) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
      }

      if (!hasSupabase()) {
        setSent(true);
        return;
      }

      const supabase = createBrowserSupabase();
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      if (signup) {
        const legalName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: legalName,
              display_name: legalName,
              phone: phone.trim(),
            },
            emailRedirectTo: `${site}/auth/callback?next=/account`,
          },
        });
        if (err) throw err;

        // Supabase returns a user with empty identities when the email is
        // already registered (to avoid account enumeration). Surface that.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          throw new Error(
            "An account with this email already exists. Sign in, or use Forgot password.",
          );
        }

        // Confirm email disabled → session is returned immediately
        if (data.session) {
          router.push("/account");
          router.refresh();
          return;
        }

        setSent(true);
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResendBusy(true);
    setResendMsg(null);
    setError(null);
    try {
      if (!hasSupabase()) {
        setResendMsg("Supabase is not configured.");
        return;
      }
      const supabase = createBrowserSupabase();
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${site}/auth/callback?next=/account`,
        },
      });
      if (err) throw err;
      setResendMsg("Verification email sent again. Check inbox and spam.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email");
    } finally {
      setResendBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-card border border-olive/10 bg-white p-8 text-center shadow-soft">
        <h1 className="font-display text-2xl text-ink">Check your email</h1>
        <p className="mt-3 text-sm text-ink-muted">
          We sent a verification link to{" "}
          <strong className="text-ink">{email}</strong>. Click it to finish
          setting up your account.
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          If nothing arrives in a few minutes, check spam — or resend below.
        </p>
        {resendMsg && (
          <p className="mt-3 text-sm text-olive">{resendMsg}</p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={resendVerification}
          disabled={resendBusy}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-soft border border-olive/20 px-4 text-sm font-medium text-olive transition-all hover:bg-cream-50 disabled:opacity-50"
        >
          {resendBusy ? "Sending…" : "Resend verification email"}
        </button>
        <p className="mt-4 text-sm text-ink-muted">
          <Link href="/login" className="text-olive underline">
            Back to sign in
          </Link>
        </p>
        {!hasSupabase() && (
          <p className="mt-3 text-sm text-ink-soft">
            Supabase is not configured —{" "}
            <Link href="/account" className="text-olive underline">
              continue to account
            </Link>
            .
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-card border border-olive/10 bg-white p-8 shadow-soft">
      <h1 className="text-center font-display text-2xl text-ink">
        {signup ? "Create Account" : "Sign In"}
      </h1>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={loading}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-soft border border-olive/15 bg-white text-sm font-medium text-ink transition-all hover:bg-cream-50 active:scale-[0.98] disabled:opacity-50"
      >
        <GoogleIcon className="h-5 w-5" />
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-olive/15" />
        <span className="text-xs font-medium tracking-wide text-ink-soft">
          — OR —
        </span>
        <span className="h-px flex-1 bg-olive/15" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {signup && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-ink-muted">First name</span>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={fieldClass}
                autoComplete="given-name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Last name</span>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={fieldClass}
                autoComplete="family-name"
              />
            </label>
          </div>
        )}

        <label className="block text-sm">
          <span className="text-ink-muted">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
          />
        </label>

        {signup && (
          <label className="block text-sm">
            <span className="text-ink-muted">Phone</span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClass}
              autoComplete="tel"
              placeholder="+92…"
            />
          </label>
        )}

        <label className="block text-sm">
          <span className="text-ink-muted">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>

        {signup && (
          <label className="block text-sm">
            <span className="text-ink-muted">Confirm password</span>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        )}

        {!signup && (
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-olive underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Please wait…" : signup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {signup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-olive underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/login?mode=signup"
              className="font-medium text-olive underline"
            >
              Create account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md rounded-card bg-white p-8 text-center text-ink-muted shadow-soft">
          Loading…
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
