import { Section } from "@/components/ui/Section";
import type { SiteContact } from "@/types";
import { MapPin, Navigation } from "lucide-react";

/**
 * Map embed placeholder. Pass `mapEmbedUrl` (Google Maps embed iframe src)
 * once the place link is ready. Until then we show a styled locator panel.
 */
export function LocateUs({
  contact,
  mapEmbedUrl,
}: {
  contact: SiteContact;
  mapEmbedUrl?: string | null;
}) {
  const address = [
    contact.addressLine1,
    contact.addressLine2,
    `${contact.city}, ${contact.region} ${contact.postalCode}`,
  ]
    .filter(Boolean)
    .join(", ");

  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <Section
      id="locate"
      eyebrow="Find us"
      title="Locate the house"
      description="Come by during front-desk hours, or drop a pin for later."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div className="flex flex-col justify-between rounded-card bg-olive p-7 text-cream-50 md:p-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-sage">
              Address
            </p>
            <p className="mt-4 font-display text-2xl font-semibold leading-snug">
              {contact.addressLine1}
              {contact.addressLine2 ? (
                <>
                  <br />
                  {contact.addressLine2}
                </>
              ) : null}
            </p>
            <p className="mt-2 text-cream-200">
              {contact.city}, {contact.region} {contact.postalCode}
            </p>
            <p className="mt-6 text-sm text-cream-200">{contact.hours}</p>
          </div>
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-soft bg-cream-50 px-5 text-sm font-medium text-olive transition-colors hover:bg-white"
          >
            <Navigation className="h-4 w-4" />
            Get directions
          </a>
        </div>

        <div className="relative min-h-[280px] overflow-hidden rounded-card border border-olive/10 bg-cream-100 sm:min-h-[340px]">
          {mapEmbedUrl ? (
            <iframe
              title="Guestay location map"
              src={mapEmbedUrl}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(231,231,214,0.95), rgba(166,172,126,0.28)), radial-gradient(circle at 30% 40%, rgba(59,68,48,0.08), transparent 50%), radial-gradient(circle at 70% 70%, rgba(166,172,126,0.22), transparent 45%)",
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive text-cream-50 shadow-lift">
                <MapPin className="h-6 w-6" />
              </div>
              <p className="max-w-xs font-display text-lg font-medium text-ink">
                Map embeds here
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                {contact.mapEmbedNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
