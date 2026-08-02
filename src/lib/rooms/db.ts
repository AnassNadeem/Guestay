import { amenitiesCatalog } from "@/lib/mock/rooms";
import { createServiceSupabase, hasSupabase } from "@/lib/supabase/client";
import type {
  Room,
  RoomCategory,
  RoomPricingTier,
  RoomStatus,
  RoomType,
} from "@/types";

type DbRoom = {
  id: string;
  slug: string;
  name: string;
  category: RoomCategory;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  size_sq_ft: number | null;
  beds: number;
  allows_shared_booking: boolean;
  allows_exclusive_booking: boolean;
  status: RoomStatus;
  featured: boolean;
  cover_image_path: string | null;
  amenities: string[] | null;
  house_rules: string[] | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  room_pricing?: Array<{
    booking_mode: "shared" | "exclusive";
    tier1_rate_pkr: number;
    tier2_rate_pkr: number;
    tier3_rate_pkr: number;
    tier4_rate_pkr: number;
    breakpoint_t2: number;
    breakpoint_t3: number;
    breakpoint_t4: number;
    security_deposit_pkr: number;
  }> | null;
  room_images?: Array<{ storage_path: string; sort_order: number }> | null;
};

function categoryToType(category: RoomCategory): RoomType {
  if (category === "flat") return "flat";
  if (category === "private_room") return "personal";
  return "shared";
}

function mapRoom(row: DbRoom): Room {
  const pricing: RoomPricingTier[] = (row.room_pricing || []).map((p) => ({
    bookingMode: p.booking_mode,
    tier1RatePkr: p.tier1_rate_pkr,
    tier2RatePkr: p.tier2_rate_pkr,
    tier3RatePkr: p.tier3_rate_pkr,
    tier4RatePkr: p.tier4_rate_pkr,
    breakpointT2: p.breakpoint_t2,
    breakpointT3: p.breakpoint_t3,
    breakpointT4: p.breakpoint_t4,
    securityDepositPkr: p.security_deposit_pkr,
  }));

  const gallery = (row.room_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => i.storage_path);
  const cover = row.cover_image_path || gallery[0] || "";
  const images = gallery.length > 0 ? gallery : cover ? [cover] : [];
  const priceFrom = pricing.reduce(
    (min, p) => Math.min(min, p.tier1RatePkr, p.tier4RatePkr),
    pricing[0]?.tier1RatePkr ?? 0,
  );
  const deposit =
    pricing.find((p) => p.bookingMode === "exclusive")?.securityDepositPkr ||
    pricing[0]?.securityDepositPkr ||
    0;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    type: categoryToType(row.category),
    tagline: row.tagline || "",
    description: row.description || "",
    longDescription: row.long_description || row.description || "",
    priceFrom,
    currency: "PKR",
    securityDeposit: deposit,
    capacity: row.capacity,
    beds: row.beds,
    bathrooms: row.bathrooms,
    sizeSqFt: row.size_sq_ft || 0,
    bedrooms: row.bedrooms,
    allowsSharedBooking: row.allows_shared_booking,
    allowsExclusiveBooking: row.allows_exclusive_booking,
    status: row.status,
    featured: row.featured,
    amenities: row.amenities || [],
    houseRules: row.house_rules || [],
    images,
    coverImage: cover,
    pricing,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ROOM_SELECT =
  "id, slug, name, category, tagline, description, long_description, capacity, bedrooms, bathrooms, size_sq_ft, beds, allows_shared_booking, allows_exclusive_booking, status, featured, cover_image_path, amenities, house_rules, sort_order, created_at, updated_at, room_pricing(*), room_images(storage_path, sort_order)";

export async function fetchRoomsFromSupabase(filters?: {
  type?: Room["type"] | "all";
  category?: RoomCategory | "all";
  featured?: boolean;
  status?: Room["status"];
}): Promise<Room[] | null> {
  if (!hasSupabase()) return null;
  try {
    const sb = createServiceSupabase();
    let q = sb.from("rooms").select(ROOM_SELECT).order("sort_order", {
      ascending: true,
    });

    if (filters?.status) {
      q = q.eq("status", filters.status);
    } else {
      q = q.eq("status", "active");
    }
    if (filters?.featured) q = q.eq("featured", true);
    if (filters?.category && filters.category !== "all") {
      q = q.eq("category", filters.category);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[rooms] supabase list failed", error.message);
      return null;
    }

    let result = (data || []).map((r) => mapRoom(r as DbRoom));
    if (filters?.type && filters.type !== "all") {
      result = result.filter((r) => r.type === filters.type);
    }
    return result;
  } catch (e) {
    console.error("[rooms] supabase list error", e);
    return null;
  }
}

export async function fetchRoomBySlugFromSupabase(
  slug: string,
): Promise<Room | null> {
  if (!hasSupabase()) return null;
  try {
    const sb = createServiceSupabase();
    const { data, error } = await sb
      .from("rooms")
      .select(ROOM_SELECT)
      .eq("slug", slug)
      .neq("status", "archived")
      .maybeSingle();
    if (error || !data) return null;
    return mapRoom(data as DbRoom);
  } catch {
    return null;
  }
}

export { amenitiesCatalog };
