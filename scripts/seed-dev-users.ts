/**
 * Dev-only seed for Owner/Manager auth users.
 * Gated: refuses to run unless SEED_DEV_USERS=1 and not production.
 *
 * Usage:
 *   SEED_DEV_USERS=1 npx tsx scripts/seed-dev-users.ts
 *
 * Credentials (local only):
 *   owner@guestay.test / OwnerDemo#2026
 *   manager@guestay.test / ManagerDemo#2026
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  if (process.env.SEED_DEV_USERS !== "1") {
    console.error("Refusing: set SEED_DEV_USERS=1 to run.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing: never seed demo users in production.");
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

  const users = [
    {
      email: "owner@guestay.test",
      password: "OwnerDemo#2026",
      role: "owner",
      full_name: "Owner Demo",
    },
    {
      email: "manager@guestay.test",
      password: "ManagerDemo#2026",
      role: "manager",
      full_name: "Manager Demo",
    },
  ];

  for (const u of users) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error && !error.message.toLowerCase().includes("already")) {
      console.error(u.email, error.message);
      continue;
    }
    const id = data.user?.id;
    if (id) {
      await sb.from("profiles").upsert({
        id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
      });
      console.log("Seeded", u.email, u.role);
    } else {
      console.log("Exists or created:", u.email);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
