/**
 * Smoke: print sitemap room URLs from the same getRooms source.
 * Run: npx tsx scripts/smoke-sitemap-rooms.ts
 */
import { getRooms } from "../src/lib/mock";

async function main() {
  const rooms = await getRooms({ status: "active" });
  console.log("ROOM_COUNT", rooms.length);
  console.log("SLUGS", rooms.map((r) => r.slug).join(", ") || "(none)");
  for (const r of rooms) {
    console.log(`https://guestay.pk/rooms/${r.slug}`);
  }
  const known = rooms.find(
    (r) => r.slug === "shared-bedroom-a" || r.slug === "test-room",
  );
  console.log("SEEDED_OR_MOCK_SAMPLE", known?.slug ?? "NONE_IN_RESULT");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
