"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SessionUser = {
  email?: string;
  fullName?: string;
  avatarUrl?: string | null;
};

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSupabase()) return;
    const sb = createBrowserSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        setUser({
          email: u.email,
          fullName: (u.user_metadata?.full_name as string) || undefined,
          avatarUrl: (u.user_metadata?.avatar_url as string) || null,
        });
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(
        u
          ? {
              email: u.email,
              fullName: (u.user_metadata?.full_name as string) || undefined,
              avatarUrl: (u.user_metadata?.avatar_url as string) || null,
            }
          : null,
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function signOut() {
    const sb = createBrowserSupabase();
    await sb?.auth.signOut();
    setUser(null);
    setOpen(false);
  }

  const initial =
    user?.fullName?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-olive/20 bg-white text-olive transition-all hover:scale-[1.02] hover:bg-cream-50 active:scale-[0.98]",
        )}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : initial ? (
          <span className="text-sm font-medium">{initial}</span>
        ) : (
          <User className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-card border border-olive/10 bg-white shadow-lift"
          >
            {user ? (
              <div className="py-2">
                <p className="truncate px-4 py-2 text-xs text-ink-muted">
                  {user.email}
                </p>
                <Link
                  href="/account"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-cream-100"
                  onClick={() => setOpen(false)}
                >
                  My Bookings
                </Link>
                <Link
                  href="/account?tab=payments"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-cream-100"
                  onClick={() => setOpen(false)}
                >
                  Payments
                </Link>
                <Link
                  href="/account?tab=refunds"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-cream-100"
                  onClick={() => setOpen(false)}
                >
                  Request Refund
                </Link>
                <Link
                  href="/account?tab=settings"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-cream-100"
                  onClick={() => setOpen(false)}
                >
                  Account Settings
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-cream-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="py-2">
                <Link
                  href="/login"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-cream-100"
                  onClick={() => setOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="block px-4 py-2.5 text-sm text-ink hover:bg-cream-100"
                  onClick={() => setOpen(false)}
                >
                  Create Account
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
