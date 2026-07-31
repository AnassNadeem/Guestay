"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const fieldClass =
  "mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-ink outline-none focus:border-olive/40";

/**
 * Claim an auto-created booking account by choosing a password.
 * The link token is validated server-side; this page never auto-logs the user in.
 */
function SetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email")?.trim() ?? "";
  const token = params.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const linkMissing = !email || !token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (password !== confirm) throw new Error("Passwords do not match");
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not set password");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setLoading(false);
    }
  }

  if (linkMissing) {
    return (
      <Shell>
        <h1 className="text-center font-display text-2xl text-ink">
          Link incomplete
        </h1>
        <p className="mt-2 text-center text-sm text-ink-muted">
          Open the set-password link from your email, or request a new one by
          contacting bookings@guestay.pk.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-olive underline">
            Back to sign in
          </Link>
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <h1 className="text-center font-display text-2xl text-ink">
          Password saved
        </h1>
        <p className="mt-2 text-center text-sm text-ink-muted">
          Your account is ready. Sign in to open My Account and manage your
          booking.
        </p>
        <button
          type="button"
          onClick={() => {
            router.push(`/login?email=${encodeURIComponent(email)}`);
            router.refresh();
          }}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50"
        >
          Sign in
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-center font-display text-2xl text-ink">
        Set your password
      </h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Choose a password for {email}. This link expires in 24 hours and will
        not sign you in automatically.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm">
          <span className="text-ink-muted">Password</span>
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
          {loading ? "Saving…" : "Set password"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href="/login" className="text-olive underline">
          Back to sign in
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-paper px-4 pb-16 pt-24 md:pt-28">
      <div className="w-full max-w-md rounded-card border border-olive/10 bg-white p-8 shadow-soft">
        {children}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-ink-muted">
          Loading…
        </div>
      }
    >
      <SetPasswordInner />
    </Suspense>
  );
}
