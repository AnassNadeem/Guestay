/**
 * Section 1/7 smoke: hold → confirm → list from Supabase (survives process).
 *   npx tsx --env-file=.env.local scripts/smoke-booking-sot.ts
 */
import { createRoomHold } from "../src/lib/bookings/holds";
import { finalizeSuccessfulBooking } from "../src/lib/bookings/confirm";
import {
  getLocalBooking,
  listLocalBookings,
} from "../src/lib/bookings/local-store";

async function main() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const ci = checkIn.toISOString().slice(0, 10);
  const co = checkOut.toISOString().slice(0, 10);

  console.log("Creating hold for test-room", ci, "→", co);
  const hold = await createRoomHold({
    roomSlug: "test-room",
    mode: "shared",
    checkIn: ci,
    checkOut: co,
    guests: 1,
    cartItemId: `smoke-${Date.now()}`,
    guestName: "Smoke Tester",
    guestEmail: `smoke.${Date.now()}@guestay.test`,
    guestPhone: "+923001234567",
    skipAvailabilityCheck: false,
  });
  console.log("Hold:", hold.bookingId, hold.reference);

  const finalized = await finalizeSuccessfulBooking({
    bookingId: hold.bookingId,
    status: "paid",
    sessionUserId: null,
  });
  console.log(
    "Finalized:",
    finalized?.reference,
    finalized?.scenario,
    finalized?.alreadyFinalized,
  );

  const again = await getLocalBooking(hold.bookingId);
  console.log("Re-read from DB:", again?.reference, again?.status);

  const all = await listLocalBookings();
  const found = all.find((b) => b.id === hold.bookingId);
  console.log("In list:", Boolean(found), "total bookings:", all.length);

  if (!again || again.status !== "paid" || !found) {
    process.exitCode = 1;
    console.error("FAIL — booking did not persist in Supabase");
  } else {
    console.log("PASS — Supabase SoT persistence OK");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
