/**
 * iCal export + OTA import Worker
 * GET /export/:token.ics — live feed of busy dates for a room
 * POST /resync — pull remote OTA feeds immediately
 * Cron every 15 minutes for import
 */

export interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SITE_ICAL_URL?: string;
}

type Feed = {
  id: string;
  room_id: string;
  provider: "airbnb" | "booking_com";
  ical_url: string;
  active: boolean;
};

function icsEscape(text: string) {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function toIcsDate(date: string) {
  return date.replace(/-/g, "");
}

function parseIcsEvents(ics: string) {
  const events: { uid: string; start: string; end: string; summary: string }[] =
    [];
  const blocks = ics.split("BEGIN:VEVENT");
  for (const block of blocks.slice(1)) {
    const uid = /UID:(.+)/i.exec(block)?.[1]?.trim() || crypto.randomUUID();
    const dtstart = /DTSTART[^:]*:(\d{8})/i.exec(block)?.[1];
    const dtend = /DTEND[^:]*:(\d{8})/i.exec(block)?.[1] || dtstart;
    const summary = /SUMMARY:(.+)/i.exec(block)?.[1]?.trim() || "Blocked";
    if (!dtstart || !dtend) continue;
    events.push({
      uid,
      start: `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`,
      end: `${dtend.slice(0, 4)}-${dtend.slice(4, 6)}-${dtend.slice(6, 8)}`,
      summary,
    });
  }
  return events;
}

async function sb(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase not configured on Worker");
  }
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
      ...(init.headers || {}),
    },
  });
}

async function importFeeds(env: Env, feedId?: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, note: "Supabase not bound" };
  }

  const filter = feedId
    ? `id=eq.${feedId}`
    : "active=eq.true";
  const feedsRes = await sb(env, `ota_feeds?${filter}&select=*`);
  if (!feedsRes.ok) {
    return { ok: false, status: feedsRes.status };
  }
  const feeds = (await feedsRes.json()) as Feed[];
  let imported = 0;

  for (const feed of feeds) {
    try {
      const icsRes = await fetch(feed.ical_url);
      if (!icsRes.ok) {
        await sb(env, `ota_feeds?id=eq.${feed.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            last_sync_status: "error",
            last_error: `HTTP ${icsRes.status}`,
            last_synced_at: new Date().toISOString(),
          }),
        });
        continue;
      }
      const ics = await icsRes.text();
      const events = parseIcsEvents(ics);
      const source = feed.provider === "airbnb" ? "airbnb" : "booking_com";

      for (const ev of events) {
        await sb(
          env,
          "ota_blocks?on_conflict=room_id,source,external_uid",
          {
            method: "POST",
            body: JSON.stringify({
              room_id: feed.room_id,
              source,
              start_date: ev.start,
              end_date: ev.end,
              external_uid: ev.uid,
              raw: { summary: ev.summary },
            }),
          },
        );
        imported += 1;
      }

      await sb(env, `ota_feeds?id=eq.${feed.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_sync_status: "ok",
          last_error: null,
          last_synced_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      await sb(env, `ota_feeds?id=eq.${feed.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_sync_status: "error",
          last_error: e instanceof Error ? e.message : "import failed",
          last_synced_at: new Date().toISOString(),
        }),
      });
    }
  }

  return { ok: true, feeds: feeds.length, imported };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.startsWith("/export/")) {
      const token = url.pathname.replace("/export/", "").replace(/\.ics$/, "");

      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        const tokRes = await sb(
          env,
          `ical_export_tokens?token=eq.${token}&select=room_id`,
        );
        const toks = (await tokRes.json()) as { room_id: string }[];
        const roomId = toks[0]?.room_id;
        if (!roomId) return new Response("Not found", { status: 404 });

        const bookingsRes = await sb(
          env,
          `bookings?room_id=eq.${roomId}&status=in.(paid,partially_paid,confirmed_no_advance,pending_hold)&select=id,check_in,check_out,reference,status,hold_expires_at`,
        );
        const bookings = (await bookingsRes.json()) as {
          id: string;
          check_in: string;
          check_out: string;
          reference: string;
          status: string;
          hold_expires_at: string | null;
        }[];

        const now = Date.now();
        const events = bookings
          .filter(
            (b) =>
              b.status !== "pending_hold" ||
              (b.hold_expires_at &&
                new Date(b.hold_expires_at).getTime() > now),
          )
          .map((b) => ({
            uid: `${b.id}@guestay.pk`,
            start: b.check_in,
            end: b.check_out,
            summary: `Guestay ${b.reference}`,
          }));

        return new Response(buildIcs(events), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=60",
          },
        });
      }

      if (env.SITE_ICAL_URL) {
        const upstream = await fetch(
          `${env.SITE_ICAL_URL}?token=${encodeURIComponent(token)}`,
        );
        return new Response(await upstream.text(), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      }
      return new Response("Export not configured", { status: 503 });
    }

    if (request.method === "POST" && url.pathname === "/resync") {
      const body = await request.json().catch(() => ({}));
      const result = await importFeeds(
        env,
        (body as { feedId?: string }).feedId,
      );
      return Response.json(result);
    }

    return new Response("guestay-ical ok");
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ) {
    const result = await importFeeds(env);
    console.log("ota_import_tick", result);
  },
};

export function buildIcs(
  events: {
    uid: string;
    start: string;
    end: string;
    summary: string;
  }[],
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Guestay//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTART;VALUE=DATE:${toIcsDate(e.start)}`,
      `DTEND;VALUE=DATE:${toIcsDate(e.end)}`,
      `SUMMARY:${icsEscape(e.summary)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
