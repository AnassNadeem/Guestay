import { expireLocalHolds } from "@/lib/bookings/local-store";
import { hasSupabase, createServiceSupabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

/** Server-side hold sweep — source of truth even if client tab is closed. */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabaseCount = 0;
  if (hasSupabase()) {
    try {
      const sb = createServiceSupabase();
      const { data, error } = await sb.rpc("expire_pending_holds");
      if (!error && typeof data === "number") supabaseCount = data;
    } catch {
      /* fall through to local */
    }
  }

  const localCount = await expireLocalHolds();

  return NextResponse.json({
    expiredLocal: localCount,
    expiredSupabase: supabaseCount,
  });
}

export async function GET(req: Request) {
  return POST(req);
}
