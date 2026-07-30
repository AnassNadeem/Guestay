"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const fieldClass =
  "mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-ink outline-none focus:border-olive/40";

/** Must match Supabase Auth → OTP length (default is often 8). */
const OTP_LENGTH = 8;

type Step = "email" | "otp" | "password";

/**
 * Forgot password via Supabase recovery OTP.
 * Requires Auth email template to include {{ .Token }}
 * and custom SMTP on Supabase (Resend → noreply@guestay.pk; see .env.example).
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!hasSupabase()) {
        setStep("otp");
        return;
      }
      const supabase = createBrowserSupabase();
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
      );
      if (err) throw err;
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!hasSupabase()) {
        setStep("password");
        return;
      }
      const supabase = createBrowserSupabase();
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "recovery",
      });
      if (err) throw err;
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (password !== confirm) throw new Error("Passwords do not match");
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (!hasSupabase()) {
        router.push("/login");
        return;
      }
      const supabase = createBrowserSupabase();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-paper px-4 pb-16 pt-24 md:pt-28">
      <div className="w-full max-w-md rounded-card border border-olive/10 bg-white p-8 shadow-soft">
        <h1 className="text-center font-display text-2xl text-ink">
          Reset password
        </h1>
        <p className="mt-2 text-center text-sm text-ink-muted">
          {step === "email" &&
            `Enter your email to receive an ${OTP_LENGTH}-digit code.`}
          {step === "otp" && `Enter the code sent to ${email}.`}
          {step === "password" && "Choose a new password."}
        </p>

        {step === "email" && (
          <form onSubmit={sendCode} className="mt-6 space-y-3">
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyCode} className="mt-6 space-y-3">
            <label className="block text-sm">
              <span className="text-ink-muted">{OTP_LENGTH}-digit code</span>
              <input
                required
                inputMode="numeric"
                pattern={`[0-9]{${OTP_LENGTH}}`}
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                }
                className={`${fieldClass} tracking-[0.3em]`}
                autoComplete="one-time-code"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length !== OTP_LENGTH}
              className="inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
              className="w-full text-sm text-ink-muted hover:text-olive"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={setNewPassword} className="mt-6 space-y-3">
            <label className="block text-sm">
              <span className="text-ink-muted">New password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Confirm password</span>
              <input
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={fieldClass}
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/login" className="text-olive underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
