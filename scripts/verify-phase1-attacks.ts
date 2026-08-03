/**
 * Phase 1 active attack verification — run against live Supabase + local Next.
 * Usage: npx tsx scripts/verify-phase1-attacks.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const guestEmail = process.env.E2E_GUEST_EMAIL || "guest@guestay.test";
const guestPassword = process.env.E2E_GUEST_PASSWORD || "GuestDemo#2026";

const ROOM_UNAVAILABLE =
  "This room just became unavailable for these dates — please choose different dates or another room";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

async function main() {
  const results: Array<{ name: string; result: string }> = [];

  // ── Attack 1: role self-escalation via client UPDATE ─────────────────────
  {
    const guest = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signErr } = await guest.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword,
    });
    assert(!signErr && signIn.user, `guest login failed: ${signErr?.message}`);
    const userId = signIn.user!.id;

    const before = await guest
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    assert(before.data?.role === "guest", `expected guest role, got ${before.data?.role}`);

    const { data: updData, error: updErr } = await guest
      .from("profiles")
      .update({ role: "owner" })
      .eq("id", userId)
      .select("role")
      .maybeSingle();

    const after = await guest
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const blocked =
      after.data?.role === "guest" &&
      (updErr != null || updData == null || updData.role !== "owner");

    results.push({
      name: "1. profiles.role self-escalation",
      result: blocked
        ? `BLOCKED (role still guest; update error=${updErr?.message ?? "none/empty"})`
        : `FAILED OPEN — role is now ${after.data?.role}`,
    });
    assert(blocked, "role self-escalation was not blocked");
  }

  // ── Attack 2: admin refunds/decide with no auth ───────────────────────────
  {
    const res = await fetch(`${site}/api/admin/refunds/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: "00000000-0000-4000-8000-000000000099",
        decision: "approve",
        ownerNote: "attack probe",
      }),
    });
    const body = await res.json().catch(() => ({}));
    const blocked = res.status === 401 || res.status === 403;
    results.push({
      name: "2. /api/admin/refunds/decide without auth",
      result: blocked
        ? `BLOCKED HTTP ${res.status} body=${JSON.stringify(body)}`
        : `FAILED OPEN HTTP ${res.status} body=${JSON.stringify(body)}`,
    });
    assert(blocked, `expected 401/403, got ${res.status}`);
  }

  // ── Attack 3: overlapping exclusive holds ─────────────────────────────────
  {
    const sb = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: room } = await sb
      .from("rooms")
      .select("id, capacity")
      .eq("slug", "test-room")
      .single();
    assert(room?.id, "test-room missing");

    // Far-future dates unlikely to collide with e2e (e2e uses +35 days)
    const checkIn = "2027-11-01";
    const checkOut = "2027-11-05";

    // Clean any leftovers from prior runs
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
      guest_name: "Attack Probe",
      guest_email: "attack-probe@guestay.test",
      guest_phone: "000",
      guest_count: 1,
      booking_mode: "exclusive" as const,
      beds_booked: room!.capacity,
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

    const { data: first, error: firstErr } = await sb
      .from("bookings")
      .insert({ ...base, reference: `ATK-A-${Date.now()}` })
      .select("id")
      .single();
    assert(!firstErr && first?.id, `first hold failed: ${firstErr?.message}`);

    const { data: second, error: secondErr } = await sb
      .from("bookings")
      .insert({ ...base, reference: `ATK-B-${Date.now()}` })
      .select("id")
      .single();

    const code = (secondErr as { code?: string } | null)?.code;
    const msg = secondErr?.message || "";
    const blocked =
      !second &&
      (code === "23P01" || /exclusion|unavailable|23P01/i.test(msg));

    results.push({
      name: "3. overlapping exclusive booking insert",
      result: blocked
        ? `BLOCKED code=${code} message=${msg}`
        : `FAILED OPEN secondId=${second?.id} err=${msg}`,
    });
    assert(blocked, "second overlapping exclusive booking was not rejected");

    // App-layer mapping (same helper the API uses)
    const { bookingWriteErrorMessage } = await import(
      "../src/lib/bookings/inventory-errors"
    );
    const friendly = bookingWriteErrorMessage(secondErr);
    assert(
      friendly === ROOM_UNAVAILABLE,
      `friendly message mismatch: ${friendly}`,
    );
    results.push({
      name: "3b. friendly error mapping",
      result: `OK → "${friendly}"`,
    });

    // updateRoomHoldDates path: move an existing hold onto occupied dates
    const otherIn = "2027-12-01";
    const otherOut = "2027-12-03";
    await sb
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("room_id", room!.id)
      .eq("check_in", otherIn)
      .in("status", [
        "pending_hold",
        "partially_paid",
        "paid",
        "confirmed_no_advance",
      ]);

    const { data: mover } = await sb
      .from("bookings")
      .insert({
        ...base,
        reference: `ATK-M-${Date.now()}`,
        check_in: otherIn,
        check_out: otherOut,
        nights: 2,
        subtotal_pkr: 2000,
        amount_due_pkr: 2000,
        total_pkr: 2000,
      })
      .select("id")
      .single();
    assert(mover?.id, "mover hold missing");

    const { error: moveErr } = await sb
      .from("bookings")
      .update({ check_in: checkIn, check_out: checkOut, nights: 4 })
      .eq("id", mover!.id)
      .eq("status", "pending_hold");

    const moveBlocked =
      moveErr != null &&
      ((moveErr as { code?: string }).code === "23P01" ||
        /exclusion|unavailable|23P01/i.test(moveErr.message));

    results.push({
      name: "3c. updateRoomHoldDates onto occupied dates",
      result: moveBlocked
        ? `BLOCKED code=${(moveErr as { code?: string }).code} message=${moveErr.message}`
        : `FAILED OPEN err=${moveErr?.message ?? "null"}`,
    });
    assert(moveBlocked, "update onto occupied dates was not rejected");

    // Cleanup probes
    await sb
      .from("bookings")
      .update({ status: "cancelled" })
      .in("id", [first!.id, mover!.id].filter(Boolean));
  }

  console.log("\n=== Phase 1 attack verification ===");
  for (const r of results) {
    console.log(`PASS  ${r.name}`);
    console.log(`      ${r.result}`);
  }
  console.log("All attack probes blocked as expected.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
