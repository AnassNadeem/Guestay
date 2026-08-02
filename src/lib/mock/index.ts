import type {
  Amenity,
  FaqItem,
  NearbyPlace,
  Promotion,
  Room,
  RoomCategory,
  SiteContact,
  TeamMember,
  Testimonial,
} from "@/types";
import {
  faqs,
  nearbyPlaces,
  promotions,
  siteContact,
  team,
  testimonials,
} from "./content";
import { amenitiesCatalog, rooms } from "./rooms";
import {
  fetchRoomBySlugFromSupabase,
  fetchRoomsFromSupabase,
} from "@/lib/rooms/db";

export async function getRooms(filters?: {
  type?: Room["type"] | "all";
  category?: RoomCategory | "all";
  featured?: boolean;
  status?: Room["status"];
}): Promise<Room[]> {
  const fromDb = await fetchRoomsFromSupabase(filters);
  if (fromDb && fromDb.length > 0) return fromDb;

  // Empty DB is a valid state (show nothing) when Supabase is configured
  if (fromDb && fromDb.length === 0) return [];

  let result = [...rooms];
  if (filters?.featured) {
    result = result.filter((r) => r.featured);
  }
  if (filters?.status) {
    result = result.filter((r) => r.status === filters.status);
  } else {
    result = result.filter((r) => r.status === "active");
  }
  if (filters?.category && filters.category !== "all") {
    result = result.filter((r) => r.category === filters.category);
  }
  if (filters?.type && filters.type !== "all") {
    result = result.filter((r) => r.type === filters.type);
  }
  return result;
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  const fromDb = await fetchRoomBySlugFromSupabase(slug);
  if (fromDb) return fromDb;
  // Prefer DB miss over mock when Supabase is live (avoid ghost inventory)
  const { hasSupabase } = await import("@/lib/supabase/client");
  if (hasSupabase()) return null;
  return rooms.find((r) => r.slug === slug && r.status !== "archived") ?? null;
}

export async function getFeaturedRooms(limit = 5): Promise<Room[]> {
  const featured = await getRooms({ featured: true });
  return featured.slice(0, limit);
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
  return {
    ...siteContact,
    phone: process.env.NEXT_PUBLIC_PHONE || siteContact.phone,
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || siteContact.whatsapp,
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || siteContact.email,
  };
}

export async function getNearbyPlaces(): Promise<NearbyPlace[]> {
  return [...nearbyPlaces].sort((a, b) => a.minutes - b.minutes);
}
