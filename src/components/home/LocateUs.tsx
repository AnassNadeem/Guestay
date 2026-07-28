import type { NearbyPlace, SiteContact } from "@/types";
import {
  Clock,
  HeartPulse,
  Navigation,
  Plane,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const kindIcon: Record<NearbyPlace["kind"], LucideIcon> = {
  shopping: ShoppingBag,
  healthcare: HeartPulse,
  transport: Plane,
  education: Clock,
  food: Utensils,
};

/**
 * Location section: address, drive times to the landmarks guests ask about,
 * and the map. `contact.mapEmbedUrl` powers the iframe.
 */
export function LocateUs({
  contact,
  mapEmbedUrl,
  nearby = [],
}: {
  contact: SiteContact;
  mapEmbedUrl?: string | null;
  nearby?: NearbyPlace[];
}) {
  const address = [
    contact.addressLine1,
    contact.addressLine2,
    contact.city,
    contact.region,
    contact.postalCode,
    contact.country,
  ]
    .filter(Boolean)
    .join(", ");

  const embedSrc = mapEmbedUrl ?? contact.mapEmbedUrl;
  const directionsHref =
    contact.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <section
      id="locate"
      className="bg-paper py-section-sm md:py-section"
      aria-labelledby="locate-heading"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-eyebrow">The neighbourhood</p>
          <h2
            id="locate-heading"
            className="mt-3 font-serif text-3xl leading-tight text-ink md:text-[2.6rem]"
          >
            Minutes from everything that matters
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            The house sits on Bedian Road in Lahore Cantt — quiet street, quick
            exits. Here is what your day-to-day actually looks like from the
            front gate.
          </p>
        </div>

        {nearby.length > 0 && (
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {nearby.map((place) => {
              const Icon = kindIcon[place.kind];
              return (
                <li
                  key={place.id}
                  className="flex flex-col gap-3 rounded-card border border-olive/10 bg-white/70 p-5 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-200 text-olive">
                      <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
                    </span>
                    <span className="font-serif text-2xl leading-none text-olive">
                      {place.minutes}
                      <span className="ml-1 text-sm font-sans text-ink-soft">
                        min
                      </span>
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-ink">{place.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      {place.note}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          <div className="flex flex-col justify-between rounded-card bg-olive p-7 text-cream-50 md:p-8">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-sage">
                Address
              </p>
              <p className="mt-4 font-serif text-2xl leading-snug text-cream-50">
                {contact.addressLine1}
                {contact.addressLine2 ? (
                  <>
                    <br />
                    {contact.addressLine2}
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-cream-200">
                {[contact.city, contact.region, contact.postalCode]
                  .filter(Boolean)
                  .join(", ")}
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
            {embedSrc ? (
              <iframe
                title="Guestay location map"
                src={embedSrc}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
                  {contact.mapEmbedNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
