import type { Page } from "@playwright/test";

/** Public site origin for Safepay return waits (local or PLAYWRIGHT_BASE_URL). */
function appOrigin(): URL {
  const base =
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  try {
    return new URL(base);
  } catch {
    return new URL("http://localhost:3000");
  }
}

/** True only when the browser is actually on our app — not when guestay.pk appears in a Safepay query param. */
function isOnAppReturn(pageUrl: string): boolean {
  try {
    const actual = new URL(pageUrl);
    const expected = appOrigin();
    if (actual.host !== expected.host) return false;
    return /\/(checkout\/return|booking-confirmed)/.test(actual.pathname);
  } catch {
    return false;
  }
}

const CARD = {
  number: "5200000000001096",
  expiry: "03/28",
  cvc: "111",
  firstName: "Abdul",
  lastName: "Qudoos",
  address: "Building 3, Apartment 5, 10th commercial lane, Zamzama",
  city: "Karachi",
  phoneLocal: "3021111111",
  email: "anas.0815@beaconite.edu.pk",
};

async function fillByHints(
  page: Page,
  hints: Array<RegExp | string>,
  value: string,
): Promise<boolean> {
  for (const hint of hints) {
    const candidates = [
      page.getByLabel(hint),
      page.getByPlaceholder(hint),
      page.getByRole("textbox", { name: hint }),
    ];
    for (const loc of candidates) {
      const first = loc.first();
      if ((await first.count().catch(() => 0)) === 0) continue;
      if (!(await first.isVisible().catch(() => false))) continue;
      await first.click({ timeout: 3000 }).catch(() => {});
      await first.fill(value).catch(async () => {
        await first.pressSequentially(value, { delay: 20 });
      });
      return true;
    }
  }
  return false;
}

/**
 * Completes Safepay sandbox hosted checkout.
 * Flow: email → mobile → card + billing → Pay.
 */
export async function completeSafepaySandboxCheckout(
  page: Page,
  opts?: { waitForReturn?: boolean },
) {
  const waitForReturn = opts?.waitForReturn !== false;
  await page.waitForURL(/getsafepay\.com|safepay/i, { timeout: 60_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);

  // Email
  const email = page
    .getByLabel(/email/i)
    .or(page.getByPlaceholder(/email/i))
    .or(page.locator('input[type="email"]'))
    .first();
  await email.fill(CARD.email);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1200);

  // Mobile (+92 already shown)
  const phone = page
    .getByLabel(/mobile|phone/i)
    .or(page.getByPlaceholder(/mobile|phone|3012345678/i))
    .or(page.locator('input[type="tel"]'))
    .first();
  await phone.fill(CARD.phoneLocal);
  await page.keyboard.press("Tab");

  // Wait for card section
  await page
    .getByText(/card number|pay with card/i)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(800);

  // Card number
  const cardOk = await fillByHints(
    page,
    [/card number/i, /card/i],
    CARD.number,
  );
  if (!cardOk) {
    // Fallback: first visible text input after tel
    const texts = page.locator(
      'input[type="text"]:visible, input:not([type]):visible',
    );
    const count = await texts.count();
    if (count < 1) {
      throw new Error(`Safepay: no card fields after phone on ${page.url()}`);
    }
    await texts.nth(0).fill(CARD.number);
  }

  // Expiry + CVC
  if (!(await fillByHints(page, [/expir/i, /mm\s*\/\s*yy/i], CARD.expiry))) {
    const texts = page.locator('input[type="text"]:visible');
    if ((await texts.count()) >= 2) await texts.nth(1).fill(CARD.expiry);
  }
  if (!(await fillByHints(page, [/cvc/i, /cvv/i, /security code/i], CARD.cvc))) {
    const texts = page.locator('input[type="text"]:visible');
    if ((await texts.count()) >= 3) await texts.nth(2).fill(CARD.cvc);
  }

  // Billing
  await fillByHints(page, [/first name/i], CARD.firstName);
  await fillByHints(page, [/last name/i], CARD.lastName);

  const country = page.getByLabel(/country/i).or(page.locator("select").first());
  if (await country.isVisible().catch(() => false)) {
    await country.selectOption({ label: /pakistan/i }).catch(async () => {
      await country.selectOption({ value: "PK" }).catch(() => {});
    });
  }

  await fillByHints(page, [/street|address/i], CARD.address);
  await fillByHints(page, [/^city$/i, /city/i], CARD.city);

  // Scroll to bottom card Pay button — do NOT click Google Pay
  const payBtn = page
    .getByRole("button", { name: /Pay\s*Rs\.?\s*[\d,.]+/i })
    .filter({ hasNotText: /G\s*Pay|Google/i })
    .last();
  await payBtn.scrollIntoViewIfNeeded();
  for (let i = 0; i < 40; i++) {
    if (await payBtn.isEnabled().catch(() => false)) break;
    await page.waitForTimeout(500);
  }
  if (!(await payBtn.isEnabled())) {
    throw new Error("Safepay: Pay button stayed disabled after filling fields");
  }
  await payBtn.click();

  // Sandbox 3DS "Purchase Authentication" — OTP is shown on the challenge (1234)
  await handleSandbox3ds(page);

  if (waitForReturn) {
    await page.waitForURL(
      (url) => isOnAppReturn(url.href),
      { timeout: 120_000 },
    );
  } else {
    // Give Safepay a moment to fire the redirect/webhook without requiring return.
    await page.waitForTimeout(8_000);
  }
}

async function handleSandbox3ds(page: Page) {
  // Challenge may be on main page or in iframe; wait briefly for it
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (isOnAppReturn(page.url())) return;

    const roots: Array<Page | import("@playwright/test").Frame> = [
      page,
      ...page.frames().filter((f) => f !== page.mainFrame()),
    ];

    for (const root of roots) {
      const otpInput = root
        .getByPlaceholder(/enter code/i)
        .or(root.getByLabel(/code/i))
        .or(root.locator('input[type="text"], input[type="tel"], input[type="password"]').first())
        .first();

      const hasAuth =
        (await root.getByText(/Purchase Authentication|OTP:/i).count().catch(() => 0)) >
          0 ||
        (await root.getByPlaceholder(/enter code/i).count().catch(() => 0)) > 0;

      if (!hasAuth) continue;

      // Prefer the OTP printed on the page (e.g. "(OTP: 1234)")
      let otp = "1234";
      const bodyText = await root.locator("body").innerText().catch(() => "");
      const m = bodyText.match(/OTP:\s*(\d+)/i);
      if (m?.[1]) otp = m[1];

      if (await otpInput.isVisible().catch(() => false)) {
        await otpInput.fill(otp);
      } else {
        // fill first visible input in this frame
        const any = root.locator("input:visible").first();
        if (await any.count()) await any.fill(otp);
      }

      const submit = root
        .getByRole("button", { name: /^SUBMIT$/i })
        .or(root.getByRole("button", { name: /submit/i }))
        .first();
      await submit.click({ timeout: 10_000 });
      await page.waitForTimeout(2000);
      return;
    }

    await page.waitForTimeout(500);
  }
}
