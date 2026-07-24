import Link from "next/link";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

const footerLinks = {
  Stay: [
    { href: "/rooms", label: "Rooms & rates" },
    { href: "/promotions", label: "Promotions" },
    { href: "/contact", label: "Contact" },
  ],
  House: [
    { href: "/about", label: "About Guestay" },
    { href: "/about#values", label: "Values" },
    { href: "/about#location", label: "Location" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-olive/8 bg-paper">
      <div className="container-page py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mark.svg" alt="" width={36} height={30} className="h-8 w-auto" />
              <BrandWordmark size="sm" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Shared spaces, better living. A small coliving house for people who
              want a real room, a real kitchen, and neighbors who know when to
              say hello.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, items]) => (
            <div key={title}>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-sage-600">
                {title}
              </p>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-muted transition-colors hover:text-olive"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-olive/8 pt-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Guestay. All rights reserved.</p>
          <p className="font-mono text-xs tracking-wide">
            hello@guestay.example
          </p>
        </div>
      </div>
    </footer>
  );
}
