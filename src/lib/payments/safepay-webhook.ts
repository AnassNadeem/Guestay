import { createHmac, timingSafeEqual } from "crypto";

/**
 * Safepay webhook HMAC (sandbox + production).
 * Docs: signature over `timestamp + '.' + raw_body` with base64-decoded secret.
 * Expected header format: `sha256=<hex digest>` (also accepts bare hex).
 */
export function verifySafepayWebhookSignature(opts: {
  secretBase64: string;
  rawBody: string | Buffer;
  signatureHeader: string;
  timestampHeader: string;
  /** Reject if timestamp drifts more than this (ms). Default 5 minutes. */
  toleranceMs?: number;
}): { ok: true } | { ok: false; error: string } {
  const {
    secretBase64,
    rawBody,
    signatureHeader,
    timestampHeader,
    toleranceMs = 5 * 60 * 1000,
  } = opts;

  if (!signatureHeader || !timestampHeader) {
    return { ok: false, error: "Missing signature or timestamp header" };
  }

  if (toleranceMs > 0) {
    const ts = Date.parse(timestampHeader);
    if (Number.isNaN(ts)) {
      return { ok: false, error: "Invalid timestamp" };
    }
    const drift = Math.abs(Date.now() - ts);
    if (drift > toleranceMs) {
      return { ok: false, error: "Timestamp outside tolerance" };
    }
  }

  let key: Buffer;
  try {
    key = Buffer.from(secretBase64, "base64");
    if (key.length === 0) {
      // Some dashboard secrets are already raw hex/utf8
      key = Buffer.from(secretBase64, "utf8");
    }
  } catch {
    return { ok: false, error: "Invalid webhook secret encoding" };
  }

  const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const mac = createHmac("sha256", key);
  mac.update(timestampHeader, "utf8");
  mac.update(".", "utf8");
  mac.update(bodyBuf);
  const digestHex = mac.digest("hex");
  const expectedPrefixed = `sha256=${digestHex}`;

  const provided = signatureHeader.trim();
  const candidates = [expectedPrefixed, digestHex];
  const matched = candidates.some((expected) => {
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(provided);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });

  if (!matched) {
    return { ok: false, error: "Signature mismatch" };
  }
  return { ok: true };
}
