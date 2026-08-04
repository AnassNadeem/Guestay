const PROD_SITE = "https://guestay.pk";

function isLocalHost(host: string) {
  return (
    !host ||
    /^localhost(:\d+)?$/i.test(host) ||
    /^127\.0\.0\.1(:\d+)?$/i.test(host)
  );
}

function isLocalUrl(url: string | undefined | null) {
  if (!url) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.CF_PAGES) ||
    Boolean(process.env.CLOUDFLARE) ||
    Boolean(process.env.WRANGLER_SEND)
  );
}

/**
 * Canonical public origin for redirects, emails, and payment return URLs.
 *
 * Prefer the incoming request host on Workers (avoids Next baking
 * NEXT_PUBLIC_SITE_URL=localhost from .env.local into the deploy bundle).
 * Never return localhost in production so invite / reset emails stay usable.
 */
export function getSiteUrl(req?: Request): string {
  if (req) {
    const hostRaw =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const host = hostRaw.split(",")[0]?.trim() || "";

    if (!isLocalHost(host)) {
      const protoRaw =
        req.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") ? "http" : "https");
      const proto = protoRaw.split(",")[0]?.trim() || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && !isLocalUrl(fromEnv)) return fromEnv;
  if (isProductionRuntime()) return PROD_SITE;
  return fromEnv || "http://localhost:3000";
}
