/**
 * Domain types shaped for Supabase schema.
 * Swap mock fetchers in lib/mock for real queries without touching UI.
 */

export type RoomCategory = "shared_bedroom" | "private_room" | "flat";
/** @deprecated use RoomCategory */
export type RoomType = "shared" | "personal" | "flat";

export type RoomStatus = "active" | "under_development" | "archived";
export type BookingMode = "shared" | "exclusive";

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: "room" | "shared" | "building";
}

export interface RoomPricingTier {
  bookingMode: BookingMode;
  /** Nightly rates PKR for tiers 1–4 */
  tier1RatePkr: number;
  tier2RatePkr: number;
  tier3RatePkr: number;
  tier4RatePkr: number;
  /** Night-count breakpoints (defaults 7 / 15 / 30) */
  breakpointT2: number;
  breakpointT3: number;
  breakpointT4: number;
  securityDepositPkr: number;
}

export interface Room {
  id: string;
  slug: string;
  name: string;
  /** Marketing category */
  category: RoomCategory;
  /** Legacy alias for category mapping */
  type: RoomType;
  tagline: string;
  description: string;
  longDescription: string;
  /** Lowest indicative nightly (or monthly for flats) shown on cards */
  priceFrom: number;
  currency: "PKR";
  securityDeposit: number;
  capacity: number;
  beds: number;
  bathrooms: number;
  sizeSqFt: number;
  bedrooms: number;
  allowsSharedBooking: boolean;
  allowsExclusiveBooking: boolean;
  status: RoomStatus;
  featured: boolean;
  amenities: string[];
  houseRules: string[];
  images: string[];
  coverImage: string;
  pricing: RoomPricingTier[];
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

export type NearbyPlaceKind =
  | "shopping"
  | "healthcare"
  | "transport"
  | "education"
  | "food";

export interface NearbyPlace {
  id: string;
  name: string;
  kind: NearbyPlaceKind;
  /** Minutes by car in typical traffic. */
  minutes: number;
  note: string;
}

export interface SiteContact {
  email: string;
  phone: string;
  phoneDisplay: string;
  phoneSecondary?: string;
  phoneSecondaryDisplay?: string;
  whatsapp: string;
  whatsappDisplay: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  mapUrl: string;
  mapEmbedUrl: string;
  mapEmbedNote: string;
  hours: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTiktok?: string;
  socialYoutube?: string;
}

export type BookingSource = "direct" | "airbnb" | "booking_com" | "walk_in";

export type BookingStatus =
  | "pending_hold"
  | "partially_paid"
  | "paid"
  | "confirmed_no_advance"
  | "cancelled"
  | "completed"
  | "expired_hold";

export type UserRole = "owner" | "manager" | "guest";
