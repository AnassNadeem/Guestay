import { createHmac, timingSafeEqual } from "crypto";

/**
 * Safepay webhook HMAC (sandbox + production).
 *
 * Confirmed live scheme (ASP.Net guide / real dashboard deliveries):
 * HMAC-SHA512 over the raw request body bytes with SAFEPAY_WEBHOOK_SECRET
 * as a UTF-8 key; compare the lowercase hex digest to `x-sfpy-signature`
 * as bare hex (no timestamp, no algorithm prefix).
 */
export function verifySafepayWebhookSignature(opts: {
  secret: string;
  rawBody: string | Buffer;
  signatureHeader: string;
}): { ok: true } | { ok: false; error: string } {
  const { secret, rawBody, signatureHeader } = opts;

  if (!signatureHeader?.trim()) {
    return { ok: false, error: "Missing signature header" };
  }
  if (!secret) {
    return { ok: false, error: "Missing webhook secret" };
  }

  const bodyBuf = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody, "utf8");
  const digestHex = createHmac("sha512", Buffer.from(secret, "utf8"))
    .update(bodyBuf)
    .digest("hex");

  const provided = signatureHeader.trim().toLowerCase();
  // Strip accidental algorithm prefix if a proxy or older sender adds one.
  const providedBare = provided.startsWith("sha512=")
    ? provided.slice("sha512=".length)
    : provided;

  try {
    const a = Buffer.from(digestHex, "utf8");
    const b = Buffer.from(providedBare, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Signature mismatch" };
    }
  } catch {
    return { ok: false, error: "Signature mismatch" };
  }

  return { ok: true };
}
