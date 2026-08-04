/**
 * Lightweight server-side Sentry reporter for Cloudflare Workers.
 * Avoids bundling @sentry/node (and its multi‑MB deps) into the Worker script,
 * which blows the free-plan 3 MiB gzip upload limit under OpenNext.
 *
 * Client-side still uses @sentry/nextjs via instrumentation-client.ts.
 */

const DSN =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://84358d06e3eac4dc181eb8a2a737e813@o4511851776311296.ingest.de.sentry.io/4511851782013008";

type ParsedDsn = {
  publicKey: string;
  host: string;
  projectId: string;
};

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    return { publicKey, host: u.host, projectId };
  } catch {
    return null;
  }
}

export async function captureServerException(
  error: unknown,
  extras?: Record<string, unknown>,
): Promise<void> {
  const parsed = parseDsn(DSN);
  if (!parsed) return;

  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    server_name: "guestay-web",
    environment: process.env.SAFEPAY_ENV || process.env.NODE_ENV || "production",
    exception: {
      values: [
        {
          type: err.name || "Error",
          value: err.message,
          stacktrace: err.stack
            ? {
                frames: err.stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ filename: line.trim(), function: "?" }))
                  .reverse(),
              }
            : undefined,
        },
      ],
    },
    tags: { runtime: "cloudflare-worker", ...(extras?.tags as object) },
    extra: extras || {},
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event", content_type: "application/json" }),
    JSON.stringify(event),
  ].join("\n");

  const url = `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_version=7&sentry_key=${parsed.publicKey}&sentry_client=guestay-thin%2F1.0`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
  } catch (e) {
    console.warn("[sentry-thin] failed to send", e);
  }
}
