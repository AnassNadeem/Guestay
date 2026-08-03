/** Guest-facing copy when a booking insert/update hits inventory conflict. */
export const ROOM_UNAVAILABLE_MESSAGE =
  "This room just became unavailable for these dates — please choose different dates or another room";

type PgLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

/**
 * Detect Postgres exclusion / inventory conflicts (SQLSTATE 23P01)
 * and related PostgREST messages from our inventory trigger.
 */
export function isBookingExclusionError(error: PgLikeError | unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as PgLikeError;
  if (!e) return false;
  if (e.code === "23P01") return true;
  const text = `${e.message || ""} ${e.details || ""} ${e.hint || ""}`;
  return /exclusion_violation|exclusion constraint|conflicting key value|23P01/i.test(
    text,
  );
}

export function bookingWriteErrorMessage(
  error: PgLikeError | unknown,
  fallback = "Booking failed",
): string {
  if (isBookingExclusionError(error)) return ROOM_UNAVAILABLE_MESSAGE;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (msg) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
