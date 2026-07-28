/**
 * Cron: release expired pending_hold bookings.
 * Prefer expire_pending_holds() RPC; fallback PATCH + site expire URL.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CRON_SECRET?: string;
  SITE_EXPIRE_URL?: string;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ) {
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const rpc = await fetch(
        `${env.SUPABASE_URL}/rest/v1/rpc/expire_pending_holds`,
        {
          method: "POST",
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      );
      if (rpc.ok) {
        console.log("expire_holds_rpc", await rpc.text());
        return;
      }

      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/bookings?status=eq.pending_hold&hold_expires_at=lt.${encodeURIComponent(new Date().toISOString())}`,
        {
          method: "PATCH",
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "expired_hold",
            hold_expires_at: null,
          }),
        },
      );
      console.log("expire_holds_supabase", res.status);
      return;
    }

    if (env.SITE_EXPIRE_URL) {
      await fetch(env.SITE_EXPIRE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CRON_SECRET || ""}`,
        },
      });
    }
  },

  async fetch(): Promise<Response> {
    return new Response("guestay-bookings-cron ok");
  },
};
