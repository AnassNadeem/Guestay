"use client";

import { cn } from "@/lib/utils";
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
          ? "border-b border-olive/10 bg-cream/90 shadow-soft backdrop-blur-md"
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
            className="hidden h-6 w-auto sm:block"
          />
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
          <a
            href="tel:+15550198240"
            className="inline-flex h-9 items-center rounded-soft bg-olive px-4 text-sm font-medium text-cream-50 shadow-soft transition-all duration-300 ease-brand hover:bg-olive-700 hover:shadow-lift"
          >
            Call to Book
          </a>
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
        <div className="border-t border-olive/10 bg-cream px-5 py-6 md:hidden">
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
            <a
              href="tel:+15550198240"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50"
            >
              Call to Book
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
