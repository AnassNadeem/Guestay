import Link from "next/link";

const links = [
  { href: "/rooms", label: "Rooms" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-olive/10 bg-cream">
      <div className="container-page flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between md:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5"
            aria-label="Guestay home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-light.png"
              alt=""
              width={32}
              height={28}
              className="h-7 w-auto"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/wordmark-light.png"
              alt="Guestay"
              width={120}
              height={24}
              className="h-5 w-auto"
            />
          </Link>
          <p className="text-sm text-ink-muted sm:border-l sm:border-olive/10 sm:pl-5">
            Shared spaces · Better living
          </p>
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
          aria-label="Footer"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-olive"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="tel:+15550198240"
            className="text-sm font-medium text-olive transition-colors hover:text-olive-700"
          >
            Call
          </a>
          <a
            href="https://wa.me/15550198240"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-olive transition-colors hover:text-olive-700"
          >
            WhatsApp
          </a>
        </nav>
      </div>

      <div className="border-t border-olive/10">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Guestay</p>
          <p className="font-mono tracking-wide">hello@guestay.example</p>
        </div>
      </div>
    </footer>
  );
}
