/**
 * Server/edge Sentry for Cloudflare Workers is handled by src/lib/sentry-server.ts
 * (thin envelope client) to stay under Workers size limits.
 * Full @sentry/nextjs remains for the browser via instrumentation-client.ts.
 */
export async function register() {
  // no-op on Workers — avoid importing @sentry/node into the OpenNext bundle
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Headers },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const { captureServerException } = await import("@/lib/sentry-server");
  await captureServerException(error, {
    tags: {
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
    path: request.path,
    method: request.method,
  });
}
