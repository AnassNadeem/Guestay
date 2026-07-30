import { siteContact } from "@/lib/mock/content";
import { whatsappHref } from "@/lib/utils";
import Link from "next/link";

const explore = [
  { href: "/rooms", label: "Rooms" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const legal = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cancellation", label: "Cancellation & Refunds" },
];

function socialLinks() {
  return [
    { href: siteContact.socialInstagram, label: "Instagram" },
    { href: siteContact.socialFacebook, label: "Facebook" },
    { href: siteContact.socialTiktok, label: "TikTok" },
    { href: siteContact.socialYoutube, label: "YouTube" },
  ].filter((s): s is { href: string; label: string } => Boolean(s.href));
}

export function Footer() {
  const socials = socialLinks();

  return (
    <footer className="border-t border-olive/10 bg-cream-100">
      <div className="container-page grid gap-8 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:py-10">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5"
            aria-label="Guestay home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/icon-light.png"
              alt=""
              width={36}
              height={31}
              className="h-8 w-auto"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/wordmark-light.png"
              alt="Guestay"
              width={130}
              height={26}
              className="h-[1.35rem] w-auto"
            />
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Shared bedrooms and flats on Bedian Road, Lahore Cantt.
          </p>
        </div>

        <div>
          <p className="text-eyebrow text-olive">Explore</p>
          <ul className="mt-4 space-y-2.5">
            {explore.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ink-muted transition-colors hover:text-olive"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-eyebrow text-olive">Policies</p>
          <ul className="mt-4 space-y-2.5">
            {legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ink-muted transition-colors hover:text-olive"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {socials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-3">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-olive underline-offset-2 hover:underline"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-eyebrow text-olive">Get in touch</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href={`tel:${siteContact.phone}`}
                className="font-medium text-ink transition-colors hover:text-olive"
              >
                {siteContact.phoneDisplay}
              </a>
            </li>
            {siteContact.phoneSecondary && (
              <li>
                <a
                  href={`tel:${siteContact.phoneSecondary}`}
                  className="text-ink-muted transition-colors hover:text-olive"
                >
                  {siteContact.phoneSecondaryDisplay}
                </a>
              </li>
            )}
            <li>
              <a
                href={whatsappHref(siteContact.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-muted transition-colors hover:text-olive"
              >
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteContact.email}`}
                className="text-ink-muted transition-colors hover:text-olive"
              >
                {siteContact.email}
              </a>
            </li>
            <li className="pt-1 leading-relaxed text-ink-muted">
              {siteContact.addressLine1}, {siteContact.addressLine2},{" "}
              {siteContact.city}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-olive/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Guestay. All rights reserved.</p>
          <p>{siteContact.hours}</p>
        </div>
      </div>
    </footer>
  );
}
