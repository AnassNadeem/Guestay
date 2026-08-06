import { expect, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";

export function stayDates(offsetDays = 28) {
  const checkIn = addDays(new Date(), offsetDays);
  const checkOut = addDays(checkIn, 2);
  return {
    checkIn: format(checkIn, "yyyy-MM-dd"),
    checkOut: format(checkOut, "yyyy-MM-dd"),
    checkInDay: checkIn.getDate(),
    checkOutDay: checkOut.getDate(),
    checkInMonthLabel: format(checkIn, "MMMM yyyy"),
    checkOutMonthLabel: format(checkOut, "MMMM yyyy"),
  };
}

export async function loginGuestSite(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
  await page.waitForURL(/\/account/, { timeout: 30_000 });
}

export async function loginAdmin(
  page: Page,
  email: string,
  password: string,
) {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
  await page.goto(`${adminUrl}/login`);
  await page.locator("input").nth(0).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

async function goToMonth(page: Page, targetLabel: string) {
  for (let i = 0; i < 14; i++) {
    const heading = page.getByText(/^[A-Z][a-z]+ \d{4}$/).first();
    const text = (await heading.textContent())?.trim() || "";
    if (text === targetLabel) return;
    await page.getByRole("button", { name: "Next month" }).click();
    await page.waitForTimeout(150);
  }
  throw new Error(`Could not navigate calendar to ${targetLabel}`);
}

async function clickCalendarDay(page: Page, day: number) {
  await page
    .locator("button:not(.invisible):not([disabled])")
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first()
    .click();
}

export async function searchHomepage(page: Page, dates: ReturnType<typeof stayDates>) {
  await page.goto("/");
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByText("Check-in", { exact: true }).click();
  await goToMonth(page, dates.checkInMonthLabel);

  await clickCalendarDay(page, dates.checkInDay);

  if (dates.checkInMonthLabel !== dates.checkOutMonthLabel) {
    await goToMonth(page, dates.checkOutMonthLabel);
  }

  await clickCalendarDay(page, dates.checkOutDay);

  await page.getByRole("button", { name: "Search" }).click();
  await page.waitForURL(/\/rooms\?/, { timeout: 20_000 });
}

export async function bookTestRoomFromList(page: Page) {
  const card = page
    .locator("article")
    .filter({ hasText: /TEST ROOM/i })
    .first();
  await card.waitFor({ state: "visible", timeout: 25_000 });
  await card.getByRole("button", { name: "Book Now" }).click();
  await page.waitForURL(/\/checkout\?/, { timeout: 20_000 });
}

export async function fillCheckoutGuest(
  page: Page,
  opts: { name: string; email: string; phone: string },
) {
  await page.getByRole("heading", { name: "Checkout" }).waitFor({
    timeout: 30_000,
  });
  // Hold is ready when countdown appears (button stays disabled until ToS)
  await page.getByText(/Rooms held for/i).first().waitFor({ timeout: 60_000 });

  await page.locator('label:has-text("Full name") input').fill(opts.name);
  await page.locator('label:has-text("Email") input').fill(opts.email);
  await page.locator('label:has-text("Phone") input').fill(opts.phone);

  await page.getByRole("radio", { name: /^Card$/i }).click();

  const tos = page.locator('input[type="checkbox"]').first();
  await tos.check();
  await expect(tos).toBeChecked();
}
