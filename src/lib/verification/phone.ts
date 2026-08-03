/**
 * Phone verification interface.
 *
 * Plivo SMS OTP is deferred. Callers must show UI as if verification exists
 * (badge + "Verify Now"), but never treat this as a live API — the button
 * stays disabled with a "Coming soon" label until Plivo is configured.
 *
 * Swap the implementation here later; do not rebuild Account Settings.
 */

export type PhoneVerificationStatus =
  | { status: "verified"; verifiedAt: string }
  | { status: "unverified" }
  | { status: "deferred" };

export type RequestPhoneVerificationResult =
  | { ok: true; message: string }
  | { ok: false; reason: "deferred" | "error"; message: string };

/** Always unverified / deferred until Plivo is wired. */
export function getPhoneVerificationStatus(
  phoneVerifiedAt: string | null | undefined,
): PhoneVerificationStatus {
  if (phoneVerifiedAt) {
    return { status: "verified", verifiedAt: phoneVerifiedAt };
  }
  // Plivo not live — treat as deferred so UI shows Coming soon, not a broken flow
  return { status: "deferred" };
}

export function isPhoneVerificationLive(): boolean {
  return Boolean(
    process.env.PLIVO_AUTH_ID &&
      process.env.PLIVO_AUTH_TOKEN &&
      !process.env.PLIVO_AUTH_ID.includes("YOUR_"),
  );
}

/**
 * Request an SMS OTP. Until Plivo is configured this always returns deferred
 * and must never be invoked from a working "Verify Now" button.
 */
export async function requestPhoneVerification(phone: string): Promise<RequestPhoneVerificationResult> {
  void phone;
  if (!isPhoneVerificationLive()) {
    return {
      ok: false,
      reason: "deferred",
      message: "Phone verification coming soon.",
    };
  }
  // Future: Plivo OTP send
  return {
    ok: false,
    reason: "error",
    message: "Phone verification is not available yet.",
  };
}

export async function confirmPhoneVerification(
  phone: string,
  code: string,
): Promise<RequestPhoneVerificationResult> {
  void phone;
  void code;
  if (!isPhoneVerificationLive()) {
    return {
      ok: false,
      reason: "deferred",
      message: "Phone verification coming soon.",
    };
  }
  return {
    ok: false,
    reason: "error",
    message: "Phone verification is not available yet.",
  };
}
