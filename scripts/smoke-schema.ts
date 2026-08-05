import { getFaqs, getRoomBySlug, getSiteContact } from "../src/lib/mock";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLodgingBusinessJsonLd,
  buildRoomJsonLd,
} from "../src/lib/seo/schema";

async function main() {
  const contact = await getSiteContact();
  const lodging = buildLodgingBusinessJsonLd(contact);
  const faqs = await getFaqs();
  const faq = buildFaqPageJsonLd(faqs);
  const room = await getRoomBySlug("shared-bedroom-a");

  console.log("LODGING_TYPE", lodging["@type"]);
  console.log("HAS_AGG_RATING", "aggregateRating" in lodging);
  console.log(
    "FALSE_AMENITIES",
    lodging.amenityFeature
      .filter((a: { value: boolean }) => a.value === false)
      .map((a: { name: string }) => a.name)
      .join(","),
  );
  console.log("PRICE_RANGE", lodging.priceRange);
  console.log("BOOKING_URL", lodging.urlBookingPage);
  console.log("GEO", lodging.geo.latitude, lodging.geo.longitude);
  console.log("FAQ_Q_COUNT", faq?.mainEntity?.length ?? 0);

  if (room) {
    const rld = buildRoomJsonLd(room, contact);
    const bc = buildBreadcrumbJsonLd(room);
    console.log("ROOM_TYPE", rld["@type"]);
    console.log(
      "BREADCRUMB",
      bc.itemListElement.map((i: { name: string }) => i.name).join(" > "),
    );
    console.log(JSON.stringify(lodging, null, 2).slice(0, 800));
  }
}

main();
