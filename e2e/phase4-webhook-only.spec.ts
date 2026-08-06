/**
 * Phase 4 — webhook-only finalize verification.
 *
 * Run against production AFTER Safepay dashboard webhook is registered:
 *   $env:PLAYWRIGHT_BASE_URL = "https://guestay.pk"
 *   npx playwright test e2e/phase4-webhook-only.spec.ts
 *
 * Blocks /checkout/return so only the Safepay webhook can finalize payment.
 */
import { expect, test } from "@playwright/test";
import { completeSafepaySandboxCheckout } from "./helpers/safepay";
import {
  cleanupTestArtifacts,
  ensureTestRoomActive,
  getBookingById,
  waitForBookingStatusById,
} from "./helpers/supabase";
import {
  bookTestRoomFromList,
  fillCheckoutGuest,
  loginGuestSite,
  searchHomepage,
  stayDates,
} from "./helpers/ui";

const GUEST_EMAIL = process.env.E2E_GUEST_EMAIL || "guest@guestay.test";
const GUEST_PASSWORD = process.env.E2E_GUEST_PASSWORD || "GuestDemo#2026";

test("webhook-only finalize with return page blocked", async ({ page }) => {
  test.setTimeout(300_000);
  await ensureTestRoomActive();
  await loginGuestSite(page, GUEST_EMAIL, GUEST_PASSWORD);

  const dates = stayDates(42);
  await searchHomepage(page, dates);

  const holdResponsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/bookings/start-checkout") &&
      r.request().method() === "POST" &&
      r.ok(),
    { timeout: 60_000 },
  );
  await bookTestRoomFromList(page);
  const holdBody = (await (await holdResponsePromise).json()) as {
    holds?: Array<{ bookingId: string; reference: string }>;
  };
  const bookingId = holdBody.holds?.[0]?.bookingId;
  expect(bookingId).toBeTruthy();
  const hold = await getBookingById(bookingId!);
  expect(hold?.status).toBe("pending_hold");
  const reference = hold!.reference;

  await page.route("**/checkout/return**", (route) => route.abort());
  await page.route("**/api/bookings/confirm**", (route) => route.abort());
  await page.route("**/booking-confirmed**", (route) => route.abort());

  await fillCheckoutGuest(page, {
    name: "E2E Webhook Only",
    email: GUEST_EMAIL,
    phone: "+923021111111",
  });
  await page.getByRole("button", { name: /Confirm and Pay/i }).click();
  await completeSafepaySandboxCheckout(page, { waitForReturn: false });
  await page.close();

  try {
    const paid = await waitForBookingStatusById(
      bookingId!,
      ["paid", "partially_paid"],
      180_000,
    );
    // eslint-disable-next-line no-console
    console.log(
      `WEBHOOK_ONLY_PASS reference=${paid.reference} status=${paid.status} id=${paid.id}`,
    );
  } catch (e) {
    const current = await getBookingById(bookingId!);
    // eslint-disable-next-line no-console
    console.log(
      `WEBHOOK_ONLY_FAIL id=${bookingId} reference=${reference} current=${JSON.stringify(
        {
          status: current?.status,
          reference: current?.reference,
        },
      )}: ${e instanceof Error ? e.message : e}`,
    );
    throw e;
  } finally {
    await cleanupTestArtifacts({
      bookingIds: [bookingId!],
      emails: [],
    });
  }
});
