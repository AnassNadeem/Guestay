import { supabase } from "../supabase";

/** Bearer token from the current admin Supabase session for Next.js admin APIs. */
export async function adminAuthHeaders(
  extra: HeadersInit = {},
): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra as Record<string, string>),
  };
  if (!supabase) return headers;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
