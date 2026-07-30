/** Site-wide public content config — edit by hand; no Places API yet. */
export const siteConfig = {
  brand: "Guestay",
  tagline: "SHARED SPACES, BETTER LIVING.",
  // INTERIM: replace with Places API–driven rating when Maps credentials are live
  googleRating: 4.8,
  googleMapsReviewsUrl:
    "https://www.google.com/maps/place/Guestay+Apartments/@31.4731698,74.4240163,17z",
  coordinates: { lat: 31.4731698, lng: 74.4240163 },
} as const;

/**
 * PLACEHOLDER until real nearby list is provided.
 * Swap entries freely; later replace with Places API–driven data.
 */
export const nearbyPlacesConfig = [
  { name: "Padel Court", category: "Sports", walkMinutes: 5 },
  { name: "Neighborhood Park", category: "Outdoors", walkMinutes: 8 },
  { name: "Grocery Store", category: "Shopping", walkMinutes: 10 },
  { name: "Cafe Strip", category: "Food", walkMinutes: 12 },
  { name: "Pharmacy", category: "Services", walkMinutes: 7 },
] as const;
