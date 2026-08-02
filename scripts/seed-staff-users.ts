/**
 * One-time staff user bootstrap. Passwords via env only — never commit them.
 *
 *   SEED_STAFF=1 OWNER_PASSWORD=… MANAGER_PASSWORD=… npx tsx scripts/seed-staff-users.ts
 */
import { createClient } from "@supabase/supabase-js";

async function upsertStaff(opts: {
  email: string;
  password: string;
  role: "owner" | "manager";
  fullName: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed?.users?.find(
    (u) => u.email?.toLowerCase() === opts.email.toLowerCase(),
  );

  let userId = existing?.id;
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, {
      password: opts.password,
      email_confirm: true,
      user_metadata: { full_name: opts.fullName },
    });
    if (error) throw error;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { full_name: opts.fullName },
    });
    if (error) throw error;
    userId = data.user?.id;
  }

  if (!userId) throw new Error(`No user id for ${opts.email}`);

  const { error: profileErr } = await sb.from("profiles").upsert({
    id: userId,
    email: opts.email,
    full_name: opts.fullName,
    role: opts.role,
  });
  if (profileErr) throw profileErr;
  console.log("OK", opts.email, opts.role);
}

async function main() {
  if (process.env.SEED_STAFF !== "1") {
    console.error("Refusing: set SEED_STAFF=1");
    process.exit(1);
  }
  const ownerPassword = process.env.OWNER_PASSWORD;
  const managerPassword = process.env.MANAGER_PASSWORD;
  if (!ownerPassword || !managerPassword) {
    console.error("OWNER_PASSWORD and MANAGER_PASSWORD required");
    process.exit(1);
  }

  await upsertStaff({
    email: "hello@guestay.pk",
    password: ownerPassword,
    role: "owner",
    fullName: "Guestay Owner",
  });
  await upsertStaff({
    email: "bookings@guestay.pk",
    password: managerPassword,
    role: "manager",
    fullName: "Guestay Manager",
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
