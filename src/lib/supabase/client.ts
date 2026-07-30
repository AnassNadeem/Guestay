import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT"),
  );
}

let browserClient: SupabaseClient | null = null;

/**
 * Browser auth client.
 * Uses localStorage for PKCE verifier + session (more reliable for Google
 * OAuth than cookie storage across the external redirect).
 * Account pages are client-side, so cookies are not required yet.
 */
export function createBrowserSupabase() {
  if (!hasSupabase()) {
    throw new Error("Supabase is not configured");
  }
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
          storage:
            typeof window !== "undefined" ? window.localStorage : undefined,
        },
      },
    );
  }
  return browserClient;
}

export function createServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
