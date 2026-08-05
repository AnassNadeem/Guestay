/**
 * JSON-LD builders for Guestay storefront.
 *
 * Schema type decision: LodgingBusiness (not Hotel, not VacationRental).
 *
 * Why:
 * - Hotel is wrong — no hotel-service / front-desk lodging model.
 * - VacationRental (schema.org stable; Google VR rich results) fits
 *   self-catering short-stay apartments, but Guestay serves both short-
 *   and long-term coliving, including shared bedrooms. Google's VR docs
 *   frame the type as short-term vacation listings (Hotel Center path).
 * - LodgingBusiness is the accurate parent: multi-unit lodging without
 *   claiming hotel services or pure vacation-rental positioning.
 *
 * AggregateRating: omitted — homepage badge still uses a manual placeholder
 * (siteConfig.googleRating) without a verified reviewCount from Places.
 */

import type { FaqItem, Room, SiteContact } from "@/types";
import {
  absoluteUrl,
  CITY,
  COUNTRY,
  NEIGHBORHOOD,
  PRICE_RANGE,
  PROPERTY_GEO,
  PROPERTY_NAME,
  REGION,
  STREET,
} from "./site";

const categoryLabel = {
  shared_bedroom: "Shared bedroom",
  private_room: "Private room",
  flat: "Flat",
} as const;

/** House-level amenities as explicit true/false pairs (2026 AI-search practice). */
export const HOUSE_AMENITY_FEATURES: {
  name: string;
  value: boolean;
}[] = [
  { name: "wifi", value: true },
  { name: "kitchen", value: true },
  { name: "washerDryer", value: true },
  { name: "acUnit", value: true },
  { name: "heating", value: true },
  { name: "parking", value: false },
  { name: "pool", value: false },
  { name: "gymFitnessEquipment", value: false },
  { name: "petsAllowed", value: false },
  { name: "smokingAllowed", value: false },
  { name: "elevator", value: false },
  { name: "hotTub", value: false },
  { name: "airportShuttle", value: false },
];

function postalAddress(contact: SiteContact) {
  return {
    "@type": "PostalAddress",
    streetAddress: `${contact.addressLine1}, ${contact.addressLine2 || STREET}`,
    addressLocality: contact.city || CITY,
    addressRegion: REGION,
    addressCountry: COUNTRY,
    ...(contact.postalCode ? { postalCode: contact.postalCode } : {}),
  };
}

function geo() {
  return {
    "@type": "GeoCoordinates",
    latitude: PROPERTY_GEO.latitude,
    longitude: PROPERTY_GEO.longitude,
  };
}

export function buildLodgingBusinessJsonLd(contact: SiteContact) {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${absoluteUrl()}/#lodging`,
    name: PROPERTY_NAME,
    description: `Coliving and shared accommodation in ${NEIGHBORHOOD}, ${CITY}. Shared bedrooms and flats with duration-based rates.`,
    url: absoluteUrl(),
    telephone: contact.phone,
    email: contact.email,
    priceRange: PRICE_RANGE,
    address: postalAddress(contact),
    geo: geo(),
    hasMap: contact.mapUrl,
    image: absoluteUrl("/brand/lockup-light.png"),
    urlBookingPage: absoluteUrl("/rooms"),
    amenityFeature: HOUSE_AMENITY_FEATURES.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.name,
      value: a.value,
    })),
  };
}

export function buildRoomJsonLd(room: Room, contact: SiteContact) {
  const roomUrl = absoluteUrl(`/rooms/${room.slug}`);
  const additionalType =
    room.category === "flat"
      ? "Apartment"
      : room.category === "shared_bedroom"
        ? "SharedRoom"
        : "PrivateRoom";

  const amenityIds = new Set(room.amenities);
  const roomAmenities = [
    { name: "wifi", value: amenityIds.has("wifi") },
    { name: "kitchen", value: amenityIds.has("kitchen") },
    { name: "washerDryer", value: amenityIds.has("laundry") },
    { name: "acUnit", value: amenityIds.has("ac") },
    { name: "balcony", value: amenityIds.has("balcony") },
    { name: "privateBathroom", value: amenityIds.has("ensuite") },
    { name: "parking", value: false },
    { name: "petsAllowed", value: false },
    { name: "smokingAllowed", value: false },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": `${roomUrl}#accommodation`,
    name: room.name,
    description: room.description,
    url: roomUrl,
    additionalType,
    image: room.images.length > 0 ? room.images : [room.coverImage],
    numberOfBedrooms: room.bedrooms,
    numberOfBathroomsTotal: room.bathrooms,
    floorSize: {
      "@type": "QuantitativeValue",
      value: room.sizeSqFt,
      unitCode: "FTK",
    },
    occupancy: {
      "@type": "QuantitativeValue",
      value: room.capacity,
    },
    amenityFeature: roomAmenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a.name,
      value: a.value,
    })),
    offers: {
      "@type": "Offer",
      url: roomUrl,
      priceCurrency: room.currency,
      price: room.priceFrom,
      availability: "https://schema.org/InStock",
    },
    containedInPlace: {
      "@type": "LodgingBusiness",
      "@id": `${absoluteUrl()}/#lodging`,
      name: PROPERTY_NAME,
      address: postalAddress(contact),
      geo: geo(),
      urlBookingPage: roomUrl,
    },
  };
}

export function buildBreadcrumbJsonLd(room: Room) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Rooms",
        item: absoluteUrl("/rooms"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: room.name,
        item: absoluteUrl(`/rooms/${room.slug}`),
      },
    ],
  };
}

export function buildFaqPageJsonLd(faqs: FaqItem[]) {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export { categoryLabel as roomCategoryLabel };
