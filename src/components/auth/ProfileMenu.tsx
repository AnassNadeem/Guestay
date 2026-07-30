"use client";

import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  LogIn,
  LogOut,
  Settings,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const itemClass =
  "flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-cream-100";
const iconClass = "h-4 w-4 shrink-0 text-ink-muted";

type SessionUser = {
  email?: string;
  displayName?: string;
};

function initialsFrom(user: SessionUser | null): string | null {
  if (!user) return null;
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return name[0]!.toUpperCase();
  }
  return user.email?.[0]?.toUpperCase() || null;
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSupabase()) return;
    const sb = createBrowserSupabase();
    if (!sb) return;

    function fromUser(u: {
      email?: string;
      user_metadata?: Record<string, unknown>;
    }): SessionUser {
      return {
        email: u.email,
        displayName:
          (u.user_metadata?.display_name as string) ||
          (u.user_metadata?.full_name as string) ||
          undefined,
      };
    }

    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setUser(fromUser(u));
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? fromUser(u) : null);
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

  const initial = initialsFrom(user);

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
        {initial ? (
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
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <CalendarDays className={iconClass} strokeWidth={1.75} />
                  My Bookings
                </Link>
                <Link
                  href="/account?tab=payments"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <CreditCard className={iconClass} strokeWidth={1.75} />
                  Payments
                </Link>
                <Link
                  href="/account?tab=refunds"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <Wallet className={iconClass} strokeWidth={1.75} />
                  Request Refund
                </Link>
                <Link
                  href="/account?tab=settings"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <Settings className={iconClass} strokeWidth={1.75} />
                  Account Settings
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-destructive hover:bg-cream-100"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="py-2">
                <Link
                  href="/login"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <LogIn className={iconClass} strokeWidth={1.75} />
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  <UserPlus className={iconClass} strokeWidth={1.75} />
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
