/**
 * Canonical public origin for redirects, emails, and payment return URLs.
 *
 * Prefer the incoming request host on Workers (avoids Next baking
 * NEXT_PUBLIC_SITE_URL=localhost from .env.local into the deploy bundle).
 */
export function getSiteUrl(req?: Request): string {
  if (req) {
    const hostRaw =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const host = hostRaw.split(",")[0]?.trim() || "";
    const isLocal =
      !host ||
      /^localhost(:\d+)?$/i.test(host) ||
      /^127\.0\.0\.1(:\d+)?$/i.test(host);

    if (!isLocal) {
      const protoRaw =
        req.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") ? "http" : "https");
      const proto = protoRaw.split(",")[0]?.trim() || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return fromEnv || "http://localhost:3000";
}
