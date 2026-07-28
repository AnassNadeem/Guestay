import type {
  FaqItem,
  NearbyPlace,
  Promotion,
  SiteContact,
  TeamMember,
  Testimonial,
} from "@/types";

export const promotions: Promotion[] = [
  {
    id: "promo_direct_deposit",
    slug: "direct-booking-deposit",
    title: "Direct booking deposit credit",
    headline: "Book with us directly. Keep 10% of your deposit.",
    description:
      "Skip the marketplace markup. When you reserve through Guestay, we take 10% off your security deposit, returned with the rest at checkout if the room is left as you found it.",
    kind: "deposit_discount",
    value: 0.1,
    valueLabel: "10% off security deposit",
    conditions: [
      "Applies to bookings made directly with Guestay only",
      "Discount is calculated on the room's listed security deposit",
      "Cannot be combined with group no-advance stays",
      "Deposit balance is refundable under our standard checkout policy",
    ],
    exampleBefore: 25000,
    exampleAfter: 22500,
    exampleLabel: "Personal room security deposit",
    active: true,
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: null,
  },
  {
    id: "promo_group_ten",
    slug: "group-ten-plus",
    title: "Groups of 10+",
    headline: "Ten or more? Stay without an advance payment.",
    description:
      "Planning a retreat, team offsite, or friend reunion? Groups of 10+ guests can confirm rooms without paying in advance. We hold the block on a signed agreement and settle at arrival.",
    kind: "group_no_advance",
    value: 0,
    valueLabel: "No advance payment",
    conditions: [
      "Minimum 10 guests across confirmed rooms",
      "Requires a signed group agreement 14 days before arrival",
      "Valid government ID collected at check-in for each guest",
      "Cancellation window follows the group agreement, not individual rates",
    ],
    exampleBefore: 120000,
    exampleAfter: 0,
    exampleLabel: "Typical advance hold on a 10-guest stay",
    active: true,
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: null,
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t_maya",
    name: "Maya Chen",
    role: "Product designer",
    location: "3-month stay",
    quote:
      "I came for a private room and stayed because the kitchen actually felt like a kitchen, not a hotel afterthought. People cooked together without making it weird.",
    stayDuration: "3 months",
    roomSlug: "shared-bedroom-a",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    rating: 5,
  },
  {
    id: "t_jordan",
    name: "Jordan Hale",
    role: "Remote engineer",
    location: "Recurring monthly",
    quote:
      "The personal room gave me a door I could close and a desk for calls. The house rules are short. That matters more than any amenity list.",
    stayDuration: "Monthly",
    roomSlug: "shared-bedroom-a",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    rating: 5,
  },
  {
    id: "t_priya",
    name: "Priya Nair",
    role: "Grad student",
    location: "Semester stay",
    quote:
      "Sharing a room with a friend beat finding a short-term lease. We knew the price on day one, and laundry was never a scavenger hunt.",
    stayDuration: "4 months",
    roomSlug: "shared-bedroom-a",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
    rating: 5,
  },
  {
    id: "t_alex",
    name: "Alex Rivera",
    role: "Freelance writer",
    location: "6-week stay",
    quote:
      "Felt like borrowing a friend's house, not renting a bed. The lounge was lively without being loud, and checkout was painless.",
    stayDuration: "6 weeks",
    roomSlug: "shared-bedroom-a",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    rating: 5,
  },
  {
    id: "t_sofia",
    name: "Sofia Mendes",
    role: "Nurse",
    location: "Night-shift month",
    quote:
      "Blackout curtains in the shared room saved my sleep schedule. The house was respectful of quiet hours. That alone was worth it.",
    stayDuration: "1 month",
    roomSlug: "shared-bedroom-a",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    rating: 4,
  },
];

export const team: TeamMember[] = [
  {
    id: "tm_lena",
    name: "Lena Ortiz",
    role: "House lead",
    bio: "Runs day-to-day life in the house: check-ins, roommate matching, and making sure the coffee never runs out on a Monday.",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tm_sam",
    name: "Sam Okonkwo",
    role: "Community & stays",
    bio: "Builds the guest experience from inquiry to goodbye. Former hostel manager who believes shared spaces need clear boundaries.",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tm_rina",
    name: "Rina Patel",
    role: "Operations",
    bio: "Keeps maintenance, cleaning schedules, and vendor relationships quiet in the background so the house feels effortless.",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80",
  },
];

export const faqs: FaqItem[] = [
  {
    id: "faq_whats_included",
    question: "What is included in the rate?",
    answer:
      "Shared-bedroom rates typically include utilities, Wi-Fi, linen, towels, and access to the kitchen and lounge. Flat inclusions vary — confirm on the room page when you pick dates.",
    category: "stay",
  },
  {
    id: "faq_how_to_book",
    question: "How do I book a room?",
    answer:
      "Choose a room, pick check-in and check-out dates, and reserve online. Your dates are held for two hours while you complete payment on one checkout page. You can still call or WhatsApp us if you prefer a human.",
    category: "booking",
  },
  {
    id: "faq_pricing_tiers",
    question: "How is the nightly price calculated?",
    answer:
      "Longer stays unlock a lower nightly rate automatically. You only see the final total and effective per-night price for your dates — we apply the correct bracket behind the scenes.",
    category: "payments",
  },
  {
    id: "faq_deposit",
    question: "How does the security deposit work?",
    answer:
      "We hold a deposit based on the room. Book directly with Guestay and you receive 10% off that deposit. It is returned after checkout once the room passes a standard inspection.",
    category: "payments",
  },
  {
    id: "faq_groups",
    question: "Can we book for a group without paying upfront?",
    answer:
      "Yes. Groups of 10+ guests can confirm without an advance payment under our group terms. Use checkout with 10+ guests, or contact us at least two weeks before arrival.",
    category: "payments",
  },
  {
    id: "faq_what_to_bring",
    question: "What should I bring?",
    answer:
      "Linens and towels are provided in shared bedrooms. Bring toiletries and whatever makes a shared kitchen feel like yours. Unfurnished flats expect you to bring furniture.",
    category: "stay",
  },
  {
    id: "faq_work",
    question: "Can I work from the house?",
    answer:
      "Yes. Wi-Fi is built for video calls. The lounge is for conversation; quieter corners and exclusive rooms are better for focus.",
    category: "stay",
  },
];

/** Drive times quoted in typical daytime traffic from Bedian Road. */
export const nearbyPlaces: NearbyPlace[] = [
  {
    id: "np_dolmen",
    name: "Dolmen Mall",
    kind: "shopping",
    minutes: 5,
    note: "Groceries, pharmacy, and dinner without planning ahead.",
  },
  {
    id: "np_hospital",
    name: "Nearest hospital",
    kind: "healthcare",
    minutes: 10,
    note: "24/7 emergency care a short drive from the house.",
  },
  {
    id: "np_airport",
    name: "Allama Iqbal Airport",
    kind: "transport",
    minutes: 15,
    note: "Late landings and early flights stay easy.",
  },
];

export const siteContact: SiteContact = {
  email: "hello@guestay.pk",
  phone: "+923073050505",
  phoneDisplay: "0307 3050505",
  phoneSecondary: "+923410050505",
  phoneSecondaryDisplay: "0341 0050505",
  whatsapp: "923073050505",
  whatsappDisplay: "WhatsApp",
  addressLine1: "18-B, Street -1, Sadaat Town",
  addressLine2: "Bedian Road",
  city: "Lahore Cantt",
  region: "Lahore",
  postalCode: "",
  country: "Pakistan",
  mapUrl: "https://maps.app.goo.gl/WeV5BdTF3UPjTi8H8",
  mapEmbedUrl:
    "https://www.google.com/maps?q=31.4731698,74.4240163&z=16&output=embed",
  mapEmbedNote: "Guestay Apartments on Bedian Road, Lahore Cantt.",
  hours: "Front desk · Daily 9am–7pm",
  socialInstagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || undefined,
  socialFacebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || undefined,
  socialTiktok: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK || undefined,
  socialYoutube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || undefined,
};
