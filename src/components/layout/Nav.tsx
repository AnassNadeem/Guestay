"use client";

import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { siteContact } from "@/lib/mock/content";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/rooms", label: "Rooms" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Always solid/blurred for contrast QA gate — never transparent over content
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-olive/10 bg-cream-100/90 shadow-soft backdrop-blur-md transition-all duration-300 ease-brand",
        scrolled || open ? "bg-cream-100/95" : "bg-cream-100/90",
      )}
    >
      <div
        className={cn(
          "container-page flex items-center justify-between transition-all duration-300 ease-brand",
          scrolled ? "h-16" : "h-16 md:h-[4.75rem]",
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Guestay home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-light.png"
            alt=""
            width={40}
            height={34}
            className="h-8 w-auto"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark-light.png"
            alt="Guestay"
            width={140}
            height={28}
            className="hidden h-[1.35rem] w-auto sm:block"
          />
        </Link>

        <nav
          className="hidden items-center gap-9 md:flex"
          aria-label="Primary"
        >
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-[0.95rem] tracking-[0.01em] transition-colors duration-200",
                  active ? "text-olive" : "text-ink-muted hover:text-olive",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-1.5 left-0 h-px bg-sage transition-all duration-300 ease-brand",
                    active ? "w-full" : "w-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`tel:${siteContact.phone}`}
            className="text-sm text-ink-muted transition-colors hover:text-olive"
          >
            {siteContact.phoneDisplay}
          </a>
          <ProfileMenu />
          <Link
            href="/rooms"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-olive px-5 text-sm font-medium text-cream-50 shadow-soft transition-all duration-200 ease-brand hover:scale-[1.02] hover:bg-olive-700 hover:shadow-lift active:scale-[0.98]"
          >
            Book a room
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ProfileMenu />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-soft text-olive transition-colors hover:bg-olive/5"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-olive/10 bg-cream-100 md:hidden"
          >
            <div className="container-page flex flex-col gap-1 py-5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-soft px-1 py-3 font-display text-2xl text-ink transition-colors hover:text-olive"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={`tel:${siteContact.phone}`}
                className="mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-olive text-sm font-medium text-cream-50"
              >
                Call {siteContact.phoneDisplay}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
