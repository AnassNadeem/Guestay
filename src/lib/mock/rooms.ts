import type { Amenity, Room } from "@/types";

export const amenitiesCatalog: Amenity[] = [
  { id: "wifi", name: "High-speed Wi-Fi", icon: "wifi", category: "building" },
  { id: "kitchen", name: "Shared kitchen", icon: "utensils", category: "shared" },
  { id: "workspace", name: "Work nook", icon: "monitor", category: "room" },
  { id: "laundry", name: "In-house laundry", icon: "shirt", category: "building" },
  { id: "ac", name: "Climate control", icon: "thermometer", category: "room" },
  { id: "locker", name: "Personal locker", icon: "lock", category: "room" },
  { id: "lounge", name: "Community lounge", icon: "sofa", category: "shared" },
  { id: "rooftop", name: "Rooftop terrace", icon: "sun", category: "shared" },
  { id: "cleaning", name: "Weekly cleaning", icon: "sparkles", category: "building" },
  { id: "bike", name: "Bike storage", icon: "bike", category: "building" },
  { id: "ensuite", name: "Ensuite bath", icon: "bath", category: "room" },
  { id: "balcony", name: "Private balcony", icon: "trees", category: "room" },
  { id: "furnished", name: "Fully furnished", icon: "sofa", category: "room" },
  { id: "utilities", name: "Utilities included", icon: "zap", category: "building" },
  { id: "unfurnished", name: "Unfurnished", icon: "home", category: "room" },
];

const sharedRules = [
  "Quiet hours from 10pm to 7am",
  "Shared kitchen cleaned after each use",
  "Guests overnight only with prior notice",
  "No smoking indoors",
];

const flatRules = [
  "Long-term stays preferred; discuss month-to-month terms when booking",
  "No smoking indoors",
  "Respect building quiet hours after 10pm",
  "Tenant responsible for utilities unless otherwise agreed",
];

const stock = {
  shared1:
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&q=80",
  shared2:
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
  shared3:
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1600&q=80",
  personal:
    "https://images.unsplash.com/photo-1631049035182-249067d7610b?auto=format&fit=crop&w=1600&q=80",
  flat1:
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
  flat2:
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
  lounge:
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
  kitchen:
    "https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=1600&q=80",
};

function sharedPricing(deposit: number) {
  return {
    bookingMode: "shared" as const,
    tier1RatePkr: 5000,
    tier2RatePkr: 4000,
    tier3RatePkr: 3500,
    tier4RatePkr: 3000,
    breakpointT2: 7,
    breakpointT3: 15,
    breakpointT4: 30,
    securityDepositPkr: deposit,
  };
}

function exclusivePricing(t1: number, deposit: number) {
  return {
    bookingMode: "exclusive" as const,
    tier1RatePkr: t1,
    tier2RatePkr: Math.round(t1 * 0.85),
    tier3RatePkr: Math.round(t1 * 0.75),
    tier4RatePkr: Math.round(t1 * 0.65),
    breakpointT2: 7,
    breakpointT3: 15,
    breakpointT4: 30,
    securityDepositPkr: deposit,
  };
}

/**
 * Five bookable units. Stock Unsplash photos — replace before launch.
 * Shared bedrooms support shared (per bed) and exclusive (whole room) booking.
 */
export const rooms: Room[] = [
  {
    id: "rm_shared_a",
    slug: "shared-bedroom-a",
    name: "Shared Bedroom A",
    category: "shared_bedroom",
    type: "shared",
    tagline: "3 beds with lockers — book a bed, or take the whole room.",
    description:
      "A 3-bed shared bedroom with personal lockers, reading lights, and blackout curtains. Book one bed, or reserve the entire room as a private stay.",
    longDescription:
      "Shared Bedroom A sleeps three. Each bed has a locker, reading light, and blackout curtain. Bathrooms are shared with a small floor rotation. You also get the house kitchen, lounge, laundry, and Wi-Fi built for calls. Prefer privacy? Book the room exclusively and it becomes your private room for the stay — priced higher than a single bed.",
    priceFrom: 5000,
    currency: "PKR",
    securityDeposit: 15000,
    capacity: 3,
    beds: 3,
    bathrooms: 0,
    sizeSqFt: 220,
    bedrooms: 1,
    allowsSharedBooking: true,
    allowsExclusiveBooking: true,
    status: "active",
    featured: true,
    amenities: [
      "wifi",
      "locker",
      "ac",
      "kitchen",
      "lounge",
      "laundry",
      "utilities",
      "cleaning",
    ],
    houseRules: sharedRules,
    coverImage: stock.shared1,
    images: [stock.shared1, stock.shared2, stock.lounge, stock.kitchen],
    pricing: [sharedPricing(15000), exclusivePricing(9000, 20000)],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-15T08:00:00Z",
  },
  {
    id: "rm_shared_b",
    slug: "shared-bedroom-b",
    name: "Shared Bedroom B",
    category: "shared_bedroom",
    type: "shared",
    tagline: "4 beds — flexible for friends who want the room to themselves.",
    description:
      "Our largest shared bedroom with four beds. Ideal for solo travelers or a small group booking the room exclusively.",
    longDescription:
      "Shared Bedroom B has four beds with lockers and blackout curtains. Two friends can book the whole room for themselves, or travelers can take individual beds. House amenities — kitchen, lounge, laundry, Wi-Fi — are included either way.",
    priceFrom: 5000,
    currency: "PKR",
    securityDeposit: 15000,
    capacity: 4,
    beds: 4,
    bathrooms: 0,
    sizeSqFt: 280,
    bedrooms: 1,
    allowsSharedBooking: true,
    allowsExclusiveBooking: true,
    status: "active",
    featured: true,
    amenities: [
      "wifi",
      "locker",
      "ac",
      "kitchen",
      "lounge",
      "laundry",
      "utilities",
      "cleaning",
    ],
    houseRules: sharedRules,
    coverImage: stock.shared2,
    images: [stock.shared2, stock.shared3, stock.lounge, stock.kitchen],
    pricing: [sharedPricing(15000), exclusivePricing(12000, 25000)],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-15T08:00:00Z",
  },
  {
    id: "rm_shared_c",
    slug: "shared-bedroom-c",
    name: "Shared Bedroom C",
    category: "shared_bedroom",
    type: "shared",
    tagline: "3 beds — same flexible shared or exclusive options.",
    description:
      "A second 3-bed shared room with the same house access. Book by the bed or lock the door for a private stay.",
    longDescription:
      "Shared Bedroom C mirrors Bedroom A: three beds, lockers, and access to the full house. Exclusive booking turns it into a personal room for your dates at the exclusive nightly rate.",
    priceFrom: 5000,
    currency: "PKR",
    securityDeposit: 15000,
    capacity: 3,
    beds: 3,
    bathrooms: 0,
    sizeSqFt: 210,
    bedrooms: 1,
    allowsSharedBooking: true,
    allowsExclusiveBooking: true,
    status: "active",
    featured: true,
    amenities: [
      "wifi",
      "locker",
      "ac",
      "kitchen",
      "lounge",
      "laundry",
      "utilities",
      "cleaning",
    ],
    houseRules: sharedRules,
    coverImage: stock.shared3,
    images: [stock.shared3, stock.personal, stock.lounge, stock.kitchen],
    pricing: [sharedPricing(15000), exclusivePricing(9000, 20000)],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-15T08:00:00Z",
  },
  {
    id: "rm_flat_3br",
    slug: "unfurnished-3br-flat",
    name: "Unfurnished 3-Bedroom Flat",
    category: "flat",
    type: "flat",
    tagline: "3 bedrooms, TV lounge, and kitchen — built for longer stays.",
    description:
      "A whole unfurnished flat with three bedrooms, a living/TV lounge, and a kitchen. Best for long-term rental.",
    longDescription:
      "This unfurnished flat gives you three bedrooms, a TV lounge / living room, and a full kitchen. Designed for longer stays and month-plus rentals. Bring your own furniture and settle in. Exact terms and deposits are confirmed at booking.",
    priceFrom: 8000,
    currency: "PKR",
    securityDeposit: 50000,
    capacity: 6,
    beds: 0,
    bathrooms: 2,
    sizeSqFt: 1200,
    bedrooms: 3,
    allowsSharedBooking: false,
    allowsExclusiveBooking: true,
    status: "active",
    featured: true,
    amenities: ["wifi", "kitchen", "lounge", "utilities", "unfurnished"],
    houseRules: flatRules,
    coverImage: stock.flat1,
    images: [stock.flat1, stock.lounge, stock.kitchen, stock.flat2],
    pricing: [exclusivePricing(8000, 50000)],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-15T08:00:00Z",
  },
  {
    id: "rm_flat_2br_roof",
    slug: "top-floor-2br-flat",
    name: "Top-Floor 2-Bedroom Flat",
    category: "flat",
    type: "flat",
    tagline: "2 bedrooms, lounge, kitchen, and roof access on the top floor.",
    description:
      "A top-floor flat with two bedrooms, TV lounge, kitchen, and roof access.",
    longDescription:
      "Sit on the top floor with two bedrooms, a living/TV lounge, a kitchen, and access to the roof. Suited to couples, small families, or friends who want a self-contained flat with outdoor air upstairs.",
    priceFrom: 10000,
    currency: "PKR",
    securityDeposit: 45000,
    capacity: 4,
    beds: 2,
    bathrooms: 1,
    sizeSqFt: 900,
    bedrooms: 2,
    allowsSharedBooking: false,
    allowsExclusiveBooking: true,
    status: "active",
    featured: true,
    amenities: [
      "wifi",
      "kitchen",
      "lounge",
      "rooftop",
      "utilities",
      "furnished",
    ],
    houseRules: flatRules,
    coverImage: stock.flat2,
    images: [stock.flat2, stock.lounge, stock.kitchen, stock.shared1],
    pricing: [exclusivePricing(10000, 45000)],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-15T08:00:00Z",
  },
];
