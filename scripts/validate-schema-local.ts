/**
 * Local JSON-LD structural checks + optional schema.org probe.
 * Rich Results Test against live requires deploy of this phase first.
 */
import { getFaqs, getRoomBySlug, getSiteContact } from "../src/lib/mock";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLodgingBusinessJsonLd,
  buildRoomJsonLd,
} from "../src/lib/seo/schema";

type Issue = string;

function checkLodging(data: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  if (data["@type"] !== "LodgingBusiness") issues.push("expected LodgingBusiness");
  for (const key of [
    "name",
    "address",
    "geo",
    "telephone",
    "priceRange",
    "urlBookingPage",
    "amenityFeature",
  ]) {
    if (data[key] == null) issues.push(`missing ${key}`);
  }
  if ("aggregateRating" in data) {
    issues.push("AggregateRating present — should be omitted while rating is placeholder");
  }
  const amenities = data.amenityFeature as { name: string; value: boolean }[];
  if (!amenities?.some((a) => a.value === false)) {
    issues.push("expected explicit false amenityFeature entries");
  }
  if (!amenities?.some((a) => a.name === "wifi" && a.value === true)) {
    issues.push("wifi:true missing");
  }
  return issues;
}

function checkFaq(data: Record<string, unknown> | null): Issue[] {
  if (!data) return ["FAQ schema null"];
  const issues: Issue[] = [];
  if (data["@type"] !== "FAQPage") issues.push("expected FAQPage");
  const entities = data.mainEntity as unknown[];
  if (!entities?.length) issues.push("no FAQ entities");
  return issues;
}

function checkRoom(data: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  if (data["@type"] !== "Accommodation") issues.push("expected Accommodation");
  if (!data.offers) issues.push("missing offers");
  if (!data.amenityFeature) issues.push("missing amenityFeature");
  return issues;
}

function checkBreadcrumb(data: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];
  if (data["@type"] !== "BreadcrumbList") issues.push("expected BreadcrumbList");
  const items = data.itemListElement as { name: string }[];
  if (items?.length !== 3) issues.push("expected 3 breadcrumb items");
  return issues;
}

async function main() {
  const contact = await getSiteContact();
  const room = await getRoomBySlug("shared-bedroom-a");
  if (!room) throw new Error("shared-bedroom-a missing from inventory source");

  const lodging = buildLodgingBusinessJsonLd(contact);
  const faq = buildFaqPageJsonLd(await getFaqs());
  const roomLd = buildRoomJsonLd(room, contact);
  const crumbs = buildBreadcrumbJsonLd(room);

  const results = [
    ["LodgingBusiness", checkLodging(lodging)],
    ["FAQPage", checkFaq(faq)],
    ["Accommodation", checkRoom(roomLd)],
    ["BreadcrumbList", checkBreadcrumb(crumbs)],
  ] as const;

  let failed = false;
  for (const [name, issues] of results) {
    if (issues.length) {
      failed = true;
      console.log(`FAIL ${name}:`, issues.join("; "));
    } else {
      console.log(`PASS ${name}`);
    }
  }

  console.log(
    "NOTE: Google Rich Results Test against https://guestay.pk will not see this markup until deploy. Live currently has 0 JSON-LD blocks.",
  );
  if (failed) process.exit(1);
}

main();
