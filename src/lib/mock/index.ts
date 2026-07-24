import type {
  Amenity,
  FaqItem,
  Promotion,
  Room,
  SiteContact,
  TeamMember,
  Testimonial,
} from "@/types";
import { faqs, promotions, siteContact, team, testimonials } from "./content";
import { amenitiesCatalog, rooms } from "./rooms";

/**
 * Data access layer — keep components depending on these functions,
 * not on raw arrays, so Supabase can replace the implementation later.
 */

export async function getRooms(filters?: {
  type?: Room["type"] | "all";
  availability?: Room["availability"] | "all";
  featured?: boolean;
}): Promise<Room[]> {
  let result = [...rooms];

  if (filters?.featured) {
    result = result.filter((r) => r.featured);
  }
  if (filters?.type && filters.type !== "all") {
    result = result.filter((r) => r.type === filters.type);
  }
  if (filters?.availability && filters.availability !== "all") {
    result = result.filter((r) => r.availability === filters.availability);
  }

  return result;
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  return rooms.find((r) => r.slug === slug) ?? null;
}

export async function getFeaturedRooms(limit = 4): Promise<Room[]> {
  return rooms.filter((r) => r.featured).slice(0, limit);
}

export async function getAmenities(): Promise<Amenity[]> {
  return amenitiesCatalog;
}

export async function getAmenitiesByIds(ids: string[]): Promise<Amenity[]> {
  return amenitiesCatalog.filter((a) => ids.includes(a.id));
}

export async function getPromotions(): Promise<Promotion[]> {
  return promotions.filter((p) => p.active);
}

export async function getPromotionBySlug(
  slug: string,
): Promise<Promotion | null> {
  return promotions.find((p) => p.slug === slug) ?? null;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return testimonials;
}

export async function getTeam(): Promise<TeamMember[]> {
  return team;
}

export async function getFaqs(): Promise<FaqItem[]> {
  return faqs;
}

export async function getSiteContact(): Promise<SiteContact> {
  return siteContact;
}

export function calculateStayQuote(input: {
  pricePerNight: number;
  securityDeposit: number;
  checkIn: string;
  checkOut: string;
  applyDirectDepositDiscount?: boolean;
}): {
  nights: number;
  subtotal: number;
  securityDeposit: number;
  depositDiscount: number;
  depositDue: number;
  totalDueToday: number;
} {
  const start = new Date(input.checkIn);
  const end = new Date(input.checkOut);
  const nights = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const subtotal = nights * input.pricePerNight;
  const depositDiscount = input.applyDirectDepositDiscount
    ? Math.round(input.securityDeposit * 0.1)
    : 0;
  const depositDue = input.securityDeposit - depositDiscount;

  return {
    nights,
    subtotal,
    securityDeposit: input.securityDeposit,
    depositDiscount,
    depositDue,
    totalDueToday: subtotal + depositDue,
  };
}
