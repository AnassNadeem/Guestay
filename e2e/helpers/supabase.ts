import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function serviceSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("YOUR_")) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type BookingRow = {
  id: string;
  reference: string;
  status: string;
  hold_expires_at: string | null;
  guest_email: string | null;
  guest_name: string | null;
  notes: string | null;
  room_id: string | null;
  check_in: string;
  check_out: string;
  amount_paid_pkr: number | null;
  total_pkr: number | null;
};

export async function getBookingById(id: string): Promise<BookingRow | null> {
  const { data, error } = await serviceSupabase()
    .from("bookings")
    .select(
      "id, reference, status, hold_expires_at, guest_email, guest_name, notes, room_id, check_in, check_out, amount_paid_pkr, total_pkr",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as BookingRow | null;
}

export async function getBookingByReference(
  reference: string,
): Promise<BookingRow | null> {
  const { data, error } = await serviceSupabase()
    .from("bookings")
    .select(
      "id, reference, status, hold_expires_at, guest_email, guest_name, notes, room_id, check_in, check_out, amount_paid_pkr, total_pkr",
    )
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data as BookingRow | null;
}

export async function waitForBookingStatus(
  reference: string,
  allowed: string[],
  timeoutMs = 90_000,
): Promise<BookingRow> {
  const deadline = Date.now() + timeoutMs;
  let last: BookingRow | null = null;
  while (Date.now() < deadline) {
    last = await getBookingByReference(reference);
    if (last && allowed.includes(last.status)) return last;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Booking ${reference} never reached ${allowed.join("|")} (last=${last?.status ?? "null"})`,
  );
}

/** Prefer this over waitForBookingStatus(HOLD-…) — finalize rewrites reference to GST-*. */
export async function waitForBookingStatusById(
  bookingId: string,
  allowed: string[],
  timeoutMs = 90_000,
): Promise<BookingRow> {
  const deadline = Date.now() + timeoutMs;
  let last: BookingRow | null = null;
  while (Date.now() < deadline) {
    last = await getBookingById(bookingId);
    if (last && allowed.includes(last.status)) return last;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Booking ${bookingId} never reached ${allowed.join("|")} (last=${last?.status ?? "null"} ref=${last?.reference ?? "null"})`,
  );
}

export async function latestPendingHoldForEmail(
  email: string,
): Promise<BookingRow | null> {
  const { data, error } = await serviceSupabase()
    .from("bookings")
    .select(
      "id, reference, status, hold_expires_at, guest_email, guest_name, notes, room_id, check_in, check_out, amount_paid_pkr, total_pkr",
    )
    .eq("status", "pending_hold")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  // Hold may exist before guest details are written — return newest pending_hold
  // for the test room dates window; caller can also match by id from network.
  return ((data || []) as BookingRow[])[0] ?? null;
}

export async function getRefundForBooking(bookingId: string) {
  const { data, error } = await serviceSupabase()
    .from("refund_requests")
    .select("id, booking_id, amount_pkr, reason, status, notes, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await serviceSupabase()
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAuthUserUnclaimed(email: string): Promise<{
  id: string;
  email: string;
  unclaimed: boolean;
} | null> {
  const { data } = await serviceSupabase().auth.admin.listUsers({
    perPage: 1000,
  });
  const user = data?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) return null;
  return {
    id: user.id,
    email: user.email!,
    unclaimed: user.user_metadata?.guestay_unclaimed === true,
  };
}

export async function ensureTestRoomActive() {
  const { data, error } = await serviceSupabase()
    .from("rooms")
    .update({ status: "active" })
    .eq("slug", "test-room")
    .select("id, slug, name, status")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Seeded test-room is missing from Supabase. Re-run supabase/seed.sql.",
    );
  }
  return data;
}

export async function cleanupTestArtifacts(opts: {
  bookingIds: string[];
  emails: string[];
}) {
  const sb = serviceSupabase();
  const marker = "[TEST RUN]";

  for (const id of opts.bookingIds) {
    if (!id) continue;
    await sb.from("refund_requests").delete().eq("booking_id", id);
    const { data: booking } = await sb
      .from("bookings")
      .select("id, notes, status")
      .eq("id", id)
      .maybeSingle();
    if (!booking) continue;
    const notes = `${marker} Playwright critical-path cleanup ${new Date().toISOString()}${
      booking.notes ? ` | ${booking.notes}` : ""
    }`;
    const { error } = await sb
      .from("bookings")
      .update({
        status: "cancelled",
        hold_expires_at: null,
        notes,
      })
      .eq("id", id);
    if (error) {
      // Soft-fail: mark via notes if status update blocked
      await sb.from("bookings").update({ notes }).eq("id", id);
    }
  }

  // Delete unclaimed ephemeral auth users created in this run (test+*@guestay.pk)
  for (const email of opts.emails) {
    if (!email.startsWith("test+") || !email.endsWith("@guestay.pk")) continue;
    const auth = await getAuthUserUnclaimed(email);
    if (!auth) continue;
    await sb.from("refund_requests").delete().eq("guest_id", auth.id);
    await sb.from("profiles").delete().eq("id", auth.id);
    await sb.auth.admin.deleteUser(auth.id);
  }
}
