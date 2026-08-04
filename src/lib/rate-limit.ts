import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type RateLimitKv = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

/**
 * Fixed-window counter in Workers KV.
 * Fail-open when KV is unbound (local/dev) so forms keep working offline.
 */
export async function checkRateLimit(opts: {
  /** Logical bucket, e.g. "contact" */
  endpoint: string;
  /** Client identity — usually IP */
  key: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window length in seconds */
  windowSec: number;
}): Promise<RateLimitResult> {
  const kv = await getRateLimitKv();
  if (!kv) {
    return { ok: true, remaining: opts.limit };
  }

  const windowId = Math.floor(Date.now() / 1000 / opts.windowSec);
  const storageKey = `rl:${opts.endpoint}:${opts.key}:${windowId}`;

  let count = 0;
  try {
    const raw = await kv.get(storageKey);
    count = raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch (e) {
    console.warn("[rate-limit] KV get failed — allowing request", e);
    return { ok: true, remaining: opts.limit };
  }

  if (count >= opts.limit) {
    const retryAfterSec =
      opts.windowSec - (Math.floor(Date.now() / 1000) % opts.windowSec);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  const next = count + 1;
  try {
    // TTL a bit past the window so the key expires after the counter is unused.
    await kv.put(storageKey, String(next), {
      expirationTtl: opts.windowSec + 60,
    });
  } catch (e) {
    console.warn("[rate-limit] KV put failed — allowing request", e);
    return { ok: true, remaining: opts.limit - next };
  }

  return { ok: true, remaining: Math.max(0, opts.limit - next) };
}

export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error:
        "You're sending requests a bit too quickly. Please wait a few minutes and try again.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

/** Thresholds — generous enough that normal guests + Playwright never trip them. */
export const RATE_LIMITS = {
  contact: { limit: 10, windowSec: 10 * 60 },
  quoteRequest: { limit: 10, windowSec: 10 * 60 },
  refundRequest: { limit: 20, windowSec: 10 * 60 },
  startCheckout: { limit: 40, windowSec: 10 * 60 },
} as const;

async function getRateLimitKv(): Promise<RateLimitKv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const kv = (env as { RATE_LIMIT_KV?: RateLimitKv }).RATE_LIMIT_KV;
    return kv ?? null;
  } catch {
    return null;
  }
}
