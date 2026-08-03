import { expect, test } from "@playwright/test";
import { completeSafepaySandboxCheckout } from "./helpers/safepay";
import {
  cleanupTestArtifacts,
  ensureTestRoomActive,
  getAuthUserUnclaimed,
  getBookingById,
  getBookingByReference,
  getProfileByEmail,
  getRefundForBooking,
  waitForBookingStatus,
} from "./helpers/supabase";
import {
  bookTestRoomFromList,
  fillCheckoutGuest,
  loginAdmin,
  loginGuestSite,
  searchHomepage,
  stayDates,
} from "./helpers/ui";

const GUEST_EMAIL = process.env.E2E_GUEST_EMAIL || "guest@guestay.test";
const GUEST_PASSWORD = process.env.E2E_GUEST_PASSWORD || "GuestDemo#2026";
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || "owner@guestay.test";
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || "OwnerDemo#2026";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";

test.describe.configure({ mode: "serial" });

test.describe("Phase 0 — critical booking path", () => {
  const createdBookingIds: string[] = [];
  const createdEmails: string[] = [];
  const results: Record<string, "PASS" | "FAIL"> = {};

  let primaryReference = "";
  let primaryBookingId = "";

  test.beforeAll(async () => {
    const room = await ensureTestRoomActive();
    expect(room.slug).toBe("test-room");
    expect(room.status).toBe("active");
  });

  test.afterAll(async () => {
    try {
      await cleanupTestArtifacts({
        bookingIds: [...new Set(createdBookingIds)],
        emails: createdEmails,
      });
      results["9. Cleanup"] = "PASS";
    } catch {
      results["9. Cleanup"] = "FAIL";
    }
    // eslint-disable-next-line no-console
    console.log("\n=== Critical-path step results ===");
    for (const [k, v] of Object.entries(results)) {
      // eslint-disable-next-line no-console
      console.log(`${v.padEnd(4)} ${k}`);
    }
  });

  test("critical path steps 1–8", async ({ page, browser }) => {
    // Login before checkout (step 3 requirement) — do it up front so hold+pay share one booking
    await loginGuestSite(page, GUEST_EMAIL, GUEST_PASSWORD);

    // ── 1. Search ──────────────────────────────────────────────
    await test.step("1. Search homepage → /rooms", async () => {
      try {
        const dates = stayDates(35);
        await searchHomepage(page, dates);
        await expect(page).toHaveURL(/\/rooms\?/);
        await expect(page.locator("body")).toContainText(/TEST ROOM/i);
        results["1. Search"] = "PASS";
      } catch (e) {
        results["1. Search"] = "FAIL";
        throw e;
      }
    });

    // ── 2. Select & hold ───────────────────────────────────────
    await test.step("2. Select test room & verify pending_hold", async () => {
      try {
        const holdResponsePromise = page.waitForResponse(
          (r) =>
            r.url().includes("/api/bookings/start-checkout") &&
            r.request().method() === "POST" &&
            r.ok(),
          { timeout: 60_000 },
        );

        await bookTestRoomFromList(page);

        const holdRes = await holdResponsePromise;
        const holdBody = (await holdRes.json()) as {
          holds?: Array<{ bookingId: string; reference: string }>;
        };
        const bookingId = holdBody.holds?.[0]?.bookingId;
        expect(bookingId, "start-checkout bookingId").toBeTruthy();

        const hold = await getBookingById(bookingId!);
        expect(hold).toBeTruthy();
        expect(hold!.status).toBe("pending_hold");
        expect(hold!.hold_expires_at).toBeTruthy();
        expect(new Date(hold!.hold_expires_at!).getTime()).toBeGreaterThan(
          Date.now(),
        );

        primaryBookingId = hold!.id;
        primaryReference = hold!.reference;
        createdBookingIds.push(hold!.id);
        results["2. Select & hold"] = "PASS";
      } catch (e) {
        results["2. Select & hold"] = "FAIL";
        throw e;
      }
    });

    // ── 3. Checkout + Safepay ──────────────────────────────────
    await test.step("3. Checkout logged-in guest + Safepay sandbox", async () => {
      try {
        await fillCheckoutGuest(page, {
          name: "E2E Guest Abdul",
          email: GUEST_EMAIL,
          phone: "+923021111111",
        });

        await page.getByRole("button", { name: /Confirm and Pay/i }).click();
        await completeSafepaySandboxCheckout(page);

        if (page.url().includes("/checkout/return")) {
          await page.waitForURL(/\/booking-confirmed/, { timeout: 90_000 });
        }
        await expect(page).toHaveURL(/\/booking-confirmed/, {
          timeout: 90_000,
        });

        const ref = new URL(page.url()).searchParams.get("ref");
        expect(ref, "booking reference on confirmed page").toBeTruthy();
        primaryReference = ref!;

        const row = await getBookingByReference(primaryReference);
        expect(row).toBeTruthy();
        primaryBookingId = row!.id;
        if (!createdBookingIds.includes(row!.id)) {
          createdBookingIds.push(row!.id);
        }

        results["3. Checkout logged-in + Safepay"] = "PASS";
      } catch (e) {
        results["3. Checkout logged-in + Safepay"] = "FAIL";
        throw e;
      }
    });

    // ── 4. Verify payment in Supabase ──────────────────────────
    await test.step("4. Supabase status paid/partially_paid + reference", async () => {
      try {
        const booking = await waitForBookingStatus(
          primaryReference,
          ["paid", "partially_paid"],
          60_000,
        );
        expect(["paid", "partially_paid"]).toContain(booking.status);
        expect(booking.reference.length).toBeGreaterThan(3);
        primaryBookingId = booking.id;
        results["4. Verify payment in DB"] = "PASS";
      } catch (e) {
        results["4. Verify payment in DB"] = "FAIL";
        throw e;
      }
    });

    // ── 5. Account / My Bookings ───────────────────────────────
    await test.step("5. Guest My Bookings shows booking", async () => {
      try {
        await page.goto("/account?tab=bookings");
        await expect(page.getByRole("link", { name: "My Bookings" })).toBeVisible();
        await expect(page.getByText(primaryReference)).toBeVisible({
          timeout: 20_000,
        });
        await expect(page.locator("body")).toContainText(/TEST ROOM/i);
        results["5. Account My Bookings"] = "PASS";
      } catch (e) {
        results["5. Account My Bookings"] = "FAIL";
        throw e;
      }
    });

    // ── 6. Admin visibility ────────────────────────────────────
    await test.step("6. Admin Bookings shows same booking", async () => {
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      try {
        await loginAdmin(adminPage, OWNER_EMAIL, OWNER_PASSWORD);
        await adminPage.goto(`${ADMIN_URL}/bookings`);
        await expect(adminPage.getByText(primaryReference)).toBeVisible({
          timeout: 30_000,
        });
        results["6. Admin Bookings visibility"] = "PASS";
      } catch (e) {
        results["6. Admin Bookings visibility"] = "FAIL";
        throw e;
      } finally {
        await adminContext.close();
      }
    });

    // ── 7. Refund flow ─────────────────────────────────────────
    await test.step("7. Guest refund request → DB + admin", async () => {
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      try {
        await page.goto("/account?tab=bookings");
        await expect(page.getByText(primaryReference)).toBeVisible();

        const card = page
          .locator("li")
          .filter({ hasText: primaryReference })
          .first();
        await card.getByLabel("Booking actions").click();
        await page.getByRole("button", { name: /Request Refund/i }).click();

        await page
          .locator('label:has-text("Reason") textarea')
          .fill("[TEST RUN] Playwright refund request");
        await page.getByRole("button", { name: /Submit request/i }).click();

        await expect(
          page.getByText("Refund request submitted — Pending Review"),
        ).toBeVisible({ timeout: 20_000 });

        const refund = await getRefundForBooking(primaryBookingId);
        expect(refund, "refund_requests row").toBeTruthy();
        expect(String(refund!.status).toLowerCase()).toContain("pending");

        await loginAdmin(adminPage, OWNER_EMAIL, OWNER_PASSWORD);
        await adminPage.goto(`${ADMIN_URL}/refunds`);
        await expect(
          adminPage.getByText(/\[TEST RUN\] Playwright refund request/i),
        ).toBeVisible({ timeout: 30_000 });

        results["7. Refund flow"] = "PASS";
      } catch (e) {
        results["7. Refund flow"] = "FAIL";
        throw e;
      } finally {
        await adminContext.close();
      }
    });

    // ── 8. New account creation (no prior login) ───────────────
    await test.step("8. Fresh guest checkout creates unclaimed profile", async () => {
      const fresh = await browser.newContext();
      const p = await fresh.newPage();
      const freshEmail = `test+${Date.now()}@guestay.pk`;
      createdEmails.push(freshEmail);
      try {
        const dates = stayDates(63); // mid-range stay, avoids month-edge padding days
        await searchHomepage(p, dates);
        await bookTestRoomFromList(p);
        await fillCheckoutGuest(p, {
          name: "Fresh Test Guest",
          email: freshEmail,
          phone: "+923021111112",
        });
        await p.getByRole("button", { name: /Confirm and Pay/i }).click();
        await completeSafepaySandboxCheckout(p);
        if (p.url().includes("/checkout/return")) {
          await p.waitForURL(/\/booking-confirmed/, { timeout: 90_000 });
        }
        await expect(p).toHaveURL(/\/booking-confirmed/, { timeout: 90_000 });
        const ref = new URL(p.url()).searchParams.get("ref");
        expect(ref).toBeTruthy();
        const booking = await waitForBookingStatus(ref!, [
          "paid",
          "partially_paid",
        ]);
        createdBookingIds.push(booking.id);

        const profile = await getProfileByEmail(freshEmail);
        expect(profile, "profiles row for fresh email").toBeTruthy();
        expect(profile!.email.toLowerCase()).toBe(freshEmail.toLowerCase());

        const auth = await getAuthUserUnclaimed(freshEmail);
        expect(auth, "auth user for fresh email").toBeTruthy();
        expect(auth!.unclaimed).toBe(true);

        results["8. New account unclaimed profile"] = "PASS";
      } catch (e) {
        results["8. New account unclaimed profile"] = "FAIL";
        throw e;
      } finally {
        await fresh.close();
      }
    });

  });
});
