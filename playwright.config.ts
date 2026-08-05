import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

/** Prefer PLAYWRIGHT_BASE_URL for deployed runs; fall back to local site URL. */
const SITE =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";
const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
const isRemoteTarget = !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(
  SITE,
);

const webServers: NonNullable<PlaywrightTestConfig["webServer"]> = [];

// Local Next only when not targeting a deployed URL.
if (!isRemoteTarget) {
  webServers.push({
    command: "npm run dev",
    url: SITE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  });
}

// Refine admin stays local (out of OpenNext migration scope).
// Skip when targeting a remote site — webhook-only / storefront E2E do not need it.
if (!isRemoteTarget) {
  webServers.push({
    command: "npm run dev:admin",
    url: ADMIN,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  });
}

export default defineConfig({
  testDir: "./e2e",
  // phase4-webhook-only is opt-in: run explicitly against a deployed URL
  //   PLAYWRIGHT_BASE_URL=https://guestay.pk npx playwright test e2e/phase4-webhook-only.spec.ts
  testIgnore: process.env.PLAYWRIGHT_BASE_URL
    ? []
    : ["**/phase4-webhook-only.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60 * 1000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: SITE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: webServers,
});
