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
];

const sharedRules = [
  "Quiet hours from 10pm to 7am",
  "Shared kitchen cleaned after each use",
  "Guests overnight only with prior notice",
  "No smoking indoors",
];

/**
 * Three Phase 1 categories. Swap Unsplash URLs for real property photos before launch.
 */
export const rooms: Room[] = [
  {
    id: "rm_shared",
    slug: "shared-rooms",
    name: "Shared Rooms",
    type: "shared",
    tagline: "Affordable beds in a real house, with lockers and clear house rules.",
    description:
      "Shared rooms for friends traveling together or solo guests who want a lower rate without giving up a proper kitchen and lounge.",
    longDescription:
      "Shared Rooms are built for people who want community and value. Twin or bunk layouts come with personal lockers, reading lights, and blackout curtains. Bathrooms are shared with a small rotation on the floor, never a hostel-scale crowd. You get the full house: kitchen, lounge, laundry, and Wi-Fi that holds a video call. Indicative pricing below is a starting point. Call us for current availability and the exact monthly rate.",
    priceFrom: 25000,
    currency: "PKR",
    securityDeposit: 15000,
    capacity: 4,
    beds: 4,
    bathrooms: 0,
    sizeSqFt: 220,
    bedrooms: 1,
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
    coverImage:
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1631049035182-249067d7610b?auto=format&fit=crop&w=1600&q=80",
    ],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-15T08:00:00Z",
  },
  {
    id: "rm_personal",
    slug: "full-personal-room",
    name: "Full Personal Room",
    type: "personal",
    tagline: "Your own door, desk, and wardrobe, with the house kitchen downstairs.",
    description:
      "A private room for longer stays: full-size bed, storage, work nook, and shared living spaces you actually want to use.",
    longDescription:
      "Full Personal Room is for people who want their own door without giving up the house. Expect a full-size bed, built-in wardrobe, and a desk deep enough for a laptop and a notebook. Shared kitchen and lounge are a short walk down the hall. Utilities and weekly cleaning of common areas are included. Contact us for current availability and exact pricing; the figure below is indicative only.",
    priceFrom: 45000,
    currency: "PKR",
    securityDeposit: 25000,
    capacity: 1,
    beds: 1,
    bathrooms: 0,
    sizeSqFt: 140,
    bedrooms: 1,
    featured: true,
    amenities: [
      "wifi",
      "workspace",
      "locker",
      "ac",
      "kitchen",
      "lounge",
      "laundry",
      "utilities",
      "cleaning",
      "furnished",
    ],
    houseRules: [
      ...sharedRules,
      "Keep hallway clear of personal storage",
    ],
    coverImage:
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1600&q=80",
    ],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-06-12T14:00:00Z",
  },
  {
    id: "rm_flat",
    slug: "full-2-bedroom-flats",
    name: "Full 2-Bedroom Flats",
    type: "flat",
    tagline: "Self-contained living for couples, friends, or small households.",
    description:
      "Two bedrooms, your own living space, and kitchen privacy when you want it, still connected to the Guestay community.",
    longDescription:
      "Full 2-Bedroom Flats are our most private offering. Two bedrooms, a living area, ensuite options where listed, and a kitchen you do not share with the whole house. Ideal for couples, friends sharing, or anyone staying a month or more who wants hotel-level privacy with house community when they choose it. Pricing is indicative. Call or message us for current availability and the exact rate for your dates.",
    priceFrom: 95000,
    currency: "PKR",
    securityDeposit: 50000,
    capacity: 4,
    beds: 2,
    bathrooms: 1,
    sizeSqFt: 780,
    bedrooms: 2,
    featured: true,
    amenities: [
      "wifi",
      "workspace",
      "ensuite",
      "ac",
      "kitchen",
      "lounge",
      "rooftop",
      "laundry",
      "utilities",
      "cleaning",
      "furnished",
      "balcony",
    ],
    houseRules: [
      "Quiet hours from 10pm to 7am",
      "No subletting without written approval",
      "Guests overnight only with prior notice",
      "No smoking indoors",
    ],
    coverImage:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
    ],
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z",
  },
];
