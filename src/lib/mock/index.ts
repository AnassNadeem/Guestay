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
 * Data access layer. Keep components depending on these functions,
 * not on raw arrays, so Supabase can replace the implementation later.
 */

export async function getRooms(filters?: {
  type?: Room["type"] | "all";
  featured?: boolean;
}): Promise<Room[]> {
  let result = [...rooms];

  if (filters?.featured) {
    result = result.filter((r) => r.featured);
  }
  if (filters?.type && filters.type !== "all") {
    result = result.filter((r) => r.type === filters.type);
  }

  return result;
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  return rooms.find((r) => r.slug === slug) ?? null;
}

export async function getFeaturedRooms(limit = 3): Promise<Room[]> {
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
