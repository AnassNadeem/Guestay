/**
 * Domain types shaped for a future Supabase schema.
 * Swap mock fetchers in lib/mock for real queries without touching UI.
 */

export type RoomType = "shared" | "personal" | "flat";

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: "room" | "shared" | "building";
}

export interface Room {
  id: string;
  slug: string;
  name: string;
  type: RoomType;
  tagline: string;
  description: string;
  longDescription: string;
  /** Indicative monthly starting price in PKR */
  priceFrom: number;
  currency: "PKR";
  securityDeposit: number;
  capacity: number;
  beds: number;
  bathrooms: number;
  sizeSqFt: number;
  bedrooms: number;
  featured: boolean;
  amenities: string[];
  houseRules: string[];
  images: string[];
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

export type PromotionKind =
  | "deposit_discount"
  | "group_no_advance"
  | "seasonal";

export interface Promotion {
  id: string;
  slug: string;
  title: string;
  headline: string;
  description: string;
  kind: PromotionKind;
  /** e.g. 0.10 for 10% off deposit */
  value: number;
  valueLabel: string;
  conditions: string[];
  exampleBefore: number;
  exampleAfter: number;
  exampleLabel: string;
  active: boolean;
  startsAt: string;
  endsAt: string | null;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  stayDuration: string;
  roomSlug: string | null;
  avatar: string;
  rating: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: "booking" | "stay" | "payments" | "general";
}

export interface SiteContact {
  email: string;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  whatsappDisplay: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  mapEmbedNote: string;
  hours: string;
}
