import { createHash, randomBytes } from "crypto";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type SetPasswordTokenBundle = {
  /** Plain token — only put this in the email link. */
  token: string;
  /** SHA-256 hex — store on the user, never email. */
  hash: string;
  expiresAt: string;
};

export function createSetPasswordToken(): SetPasswordTokenBundle {
  const token = randomBytes(32).toString("base64url");
  const hash = hashSetPasswordToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  return { token, hash, expiresAt };
}

export function hashSetPasswordToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function setPasswordLink(opts: {
  siteUrl: string;
  email: string;
  token: string;
}): string {
  const u = new URL("/set-password", opts.siteUrl);
  u.searchParams.set("token", opts.token);
  u.searchParams.set("email", opts.email);
  return u.toString();
}

export function isSetPasswordExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t < Date.now();
}
