import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — fewer misreads

/** Guest-facing booking reference, minted only on payment/confirm success. */
export function generateBookingReference(): string {
  const bytes = randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `GST-${body}`;
}

/** Temporary hold id — never shown as a confirmed booking reference. */
export function generateHoldReference(): string {
  return `HOLD-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function isFinalBookingReference(reference: string): boolean {
  return /^GST-[A-HJ-NP-Z2-9]{6}$/i.test(reference);
}

export function isHoldReference(reference: string): boolean {
  return reference.toUpperCase().startsWith("HOLD-");
}
