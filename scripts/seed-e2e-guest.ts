/**
 * Dev-only seed for the Playwright critical-path guest account.
 *
 *   SEED_E2E_GUEST=1 npx tsx scripts/seed-e2e-guest.ts
 *
 * Credentials (local only):
 *   guest@guestay.test / GuestDemo#2026
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  if (process.env.SEED_E2E_GUEST !== "1") {
    console.error("Refusing: set SEED_E2E_GUEST=1 to run.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing: never seed e2e guest in production.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("YOUR_")) {
    console.error("Supabase URL / service role key required.");
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = "guest@guestay.test";
  const password = "GuestDemo#2026";
  const fullName = "E2E Guest";

  const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed?.users?.find(
    (u) => u.email?.toLowerCase() === email,
  );

  let id = existing?.id;
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        guestay_unclaimed: false,
      },
    });
    if (error) throw error;
    console.log("Updated", email);
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        guestay_unclaimed: false,
      },
    });
    if (error) throw error;
    id = data.user?.id;
    console.log("Created", email);
  }

  if (!id) throw new Error("No user id");

  const { error: profileErr } = await sb.from("profiles").upsert({
    id,
    email,
    full_name: fullName,
    role: "guest",
  });
  if (profileErr) throw profileErr;
  console.log("Seeded", email, "guest");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
