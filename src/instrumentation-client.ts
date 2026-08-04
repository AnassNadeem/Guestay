// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://84358d06e3eac4dc181eb8a2a737e813@o4511851776311296.ingest.de.sentry.io/4511851782013008",
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 0.2,
  enableLogs: true,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
