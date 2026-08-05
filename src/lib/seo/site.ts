/**
 * Storefront SEO constants — neighborhood from real address data only.
 * No university-proximity claims: Places API is not wired yet.
 */
export const SITE_ORIGIN = "https://guestay.pk";

/** Specific area from siteContact (not generic "Lahore"). */
export const NEIGHBORHOOD = "Sadaat Town";
export const STREET = "Bedian Road";
export const CITY = "Lahore Cantt";
export const REGION = "Punjab";
export const COUNTRY = "PK";

export const PROPERTY_NAME = "Guestay";
export const PROPERTY_GEO = {
  latitude: 31.4731698,
  longitude: 74.4240163,
} as const;

/** Tiered nightly band across inventory (shared long-stay low → flat exclusive high). */
export const PRICE_RANGE = "PKR 3000–10000";

export const HOME_TITLE =
  "Guestay | Coliving & Shared Accommodation in Sadaat Town, Lahore Cantt";

export const HOME_DESCRIPTION =
  "Book shared bedrooms and flats at Guestay — coliving on Bedian Road in Sadaat Town, Lahore Cantt. Clear duration-based rates, direct booking, and a real house kitchen and lounge.";

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_ORIGIN;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function roomImageAlt(
  roomName: string,
  categoryLabel: string,
): string {
  return `${categoryLabel} interior at Guestay coliving, ${NEIGHBORHOOD} ${CITY}`;
}

export function roomMetaTitle(
  roomName: string,
  categoryLabel: string,
  capacity: number,
): string {
  const guests =
    capacity === 1 ? "1 guest" : `up to ${capacity} guests`;
  return `${roomName} — ${categoryLabel} for ${guests} | Guestay, ${NEIGHBORHOOD}`;
}

export function roomMetaDescription(
  roomName: string,
  categoryLabel: string,
  capacity: number,
  tagline: string,
  priceFrom: number,
): string {
  return `${roomName}: ${categoryLabel.toLowerCase()} sleeping ${capacity} at Guestay in ${NEIGHBORHOOD}, ${CITY}. From PKR ${priceFrom.toLocaleString("en-PK")}/night. ${tagline}`;
}
