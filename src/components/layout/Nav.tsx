"use client";

import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/rooms", label: "Rooms" },
  { href: "/promotions", label: "Promotions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-brand",
        scrolled || open
          ? "border-b border-olive/5 bg-white/90 shadow-soft backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between md:h-[4.5rem]">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Guestay home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mark.svg" alt="" width={40} height={34} className="h-8 w-auto" />
          <BrandWordmark size="sm" className="hidden sm:block" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-sm font-medium transition-colors",
                  active ? "text-olive" : "text-ink-muted hover:text-olive",
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 h-px w-full bg-sage" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/rooms"
            className="inline-flex h-9 items-center rounded-soft bg-olive px-4 text-sm font-medium text-cream-50 shadow-soft transition-all duration-300 ease-brand hover:bg-olive-700 hover:shadow-lift"
          >
            Check availability
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-soft text-olive md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-olive/5 bg-white px-5 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-display text-xl font-medium text-olive"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/rooms"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50"
            >
              Check availability
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
