/**
 * Part A1 — shared-bed capacity race against live Supabase.
 * Capacity 3, 1 bed already held; two simultaneous inserts for 2 beds each.
 * Without FOR UPDATE both could pass the capacity check; with it only one fits.
 *
 * Usage: npx tsx scripts/verify-shared-capacity-race.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

async function main() {
  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: room, error: roomErr } = await sb
    .from("rooms")
    .select("id, slug, capacity")
    .eq("slug", "test-room")
    .single();
  assert(!roomErr && room?.id, `test-room missing: ${roomErr?.message}`);

  const originalCapacity = room!.capacity;
  const checkIn = "2028-03-01";
  const checkOut = "2028-03-05";

  // Ensure capacity 3 for this probe
  const { error: capErr } = await sb
    .from("rooms")
    .update({ capacity: 3 })
    .eq("id", room!.id);
  assert(!capErr, `could not set capacity: ${capErr?.message}`);

  // Cancel leftovers on these dates
  await sb
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("room_id", room!.id)
    .eq("check_in", checkIn)
    .eq("check_out", checkOut)
    .in("status", [
      "pending_hold",
      "partially_paid",
      "paid",
      "confirmed_no_advance",
    ]);

  const base = {
    room_id: room!.id,
    guest_name: "Shared Race Probe",
    guest_email: "shared-race@guestay.test",
    guest_phone: "000",
    booking_mode: "shared" as const,
    check_in: checkIn,
    check_out: checkOut,
    nights: 4,
    status: "pending_hold" as const,
    source: "direct" as const,
    tier_applied: 1,
    rate_per_night_pkr: 1000,
    subtotal_pkr: 4000,
    deposit_list_pkr: 0,
    deposit_discount_pkr: 0,
    deposit_due_pkr: 0,
    amount_paid_pkr: 0,
    amount_due_pkr: 4000,
    total_pkr: 4000,
    hold_expires_at: new Date(Date.now() + 600_000).toISOString(),
    is_group_no_advance: false,
  };

  // Seed: 1 bed already booked → 2 remaining
  const { data: seed, error: seedErr } = await sb
    .from("bookings")
    .insert({
      ...base,
      reference: `SHR-SEED-${Date.now()}`,
      guest_count: 1,
      beds_booked: 1,
      subtotal_pkr: 4000,
      amount_due_pkr: 4000,
      total_pkr: 4000,
    })
    .select("id, beds_booked")
    .single();
  assert(!seedErr && seed?.id, `seed insert failed: ${seedErr?.message}`);

  const stamp = Date.now();
  // Two concurrent requests for 2 beds each — together would need 4 beds
  // on top of the seed (1+2+2=5 > 3). Individually each sees 2 free and
  // would succeed without serialization.
  const raceA = sb
    .from("bookings")
    .insert({
      ...base,
      reference: `SHR-A-${stamp}`,
      guest_count: 2,
      beds_booked: 2,
      subtotal_pkr: 8000,
      amount_due_pkr: 8000,
      total_pkr: 8000,
    })
    .select("id, beds_booked, reference")
    .single();

  const raceB = sb
    .from("bookings")
    .insert({
      ...base,
      reference: `SHR-B-${stamp}`,
      guest_count: 2,
      beds_booked: 2,
      subtotal_pkr: 8000,
      amount_due_pkr: 8000,
      total_pkr: 8000,
    })
    .select("id, beds_booked, reference")
    .single();

  const [resA, resB] = await Promise.all([raceA, raceB]);

  const okA = !!resA.data?.id && !resA.error;
  const okB = !!resB.data?.id && !resB.error;
  const successes = [okA, okB].filter(Boolean).length;
  const failures = [
    !okA
      ? {
          label: "A",
          code: (resA.error as { code?: string } | null)?.code,
          message: resA.error?.message,
        }
      : null,
    !okB
      ? {
          label: "B",
          code: (resB.error as { code?: string } | null)?.code,
          message: resB.error?.message,
        }
      : null,
  ].filter(Boolean);

  // Confirm DB occupancy for these dates
  const { data: active } = await sb
    .from("bookings")
    .select("id, reference, beds_booked, status")
    .eq("room_id", room!.id)
    .eq("check_in", checkIn)
    .eq("check_out", checkOut)
    .in("status", [
      "pending_hold",
      "partially_paid",
      "paid",
      "confirmed_no_advance",
    ]);

  const totalBeds = (active || []).reduce(
    (sum, b) => sum + (b.beds_booked || 0),
    0,
  );

  console.log("\n=== Shared-bed capacity race ===");
  console.log(`Room: test-room (temp capacity 3), seed beds=1`);
  console.log(`Dates: ${checkIn} → ${checkOut}`);
  console.log(
    `Concurrent inserts for 2 beds each: A=${okA ? "OK " + resA.data!.id : "FAIL"} B=${okB ? "OK " + resB.data!.id : "FAIL"}`,
  );
  for (const f of failures) {
    console.log(
      `  Rejected ${f!.label}: code=${f!.code} message=${f!.message}`,
    );
  }
  console.log(
    `Active rows after race: ${(active || []).length} (beds total=${totalBeds})`,
  );
  for (const b of active || []) {
    console.log(`  ${b.reference} beds=${b.beds_booked} status=${b.status}`);
  }

  const lockWorked = successes === 1 && totalBeds <= 3;
  console.log(
    lockWorked
      ? "RESULT: PASS — exactly one of the two concurrent 2-bed inserts succeeded; FOR UPDATE serialized capacity correctly."
      : `RESULT: FAIL — successes=${successes} totalBeds=${totalBeds} (expected exactly 1 success, totalBeds≤3)`,
  );

  // Cleanup
  const ids = [
    seed!.id,
    resA.data?.id,
    resB.data?.id,
  ].filter(Boolean) as string[];
  if (ids.length) {
    await sb.from("bookings").update({ status: "cancelled" }).in("id", ids);
  }
  await sb.from("rooms").update({ capacity: originalCapacity }).eq("id", room!.id);
  console.log(`Cleanup done; capacity restored to ${originalCapacity}.\n`);

  if (!lockWorked) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
