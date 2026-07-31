import type { CreatePaymentInput, PaymentGateway } from "./gateway";

const apiHosts = {
  sandbox: "https://sandbox.api.getsafepay.com",
  production: "https://api.getsafepay.com",
} as const;

/** Hosted checkout pages (different from API hosts — see @sfpy/node-core). */
const checkoutHosts = {
  sandbox: "https://sandbox.api.getsafepay.com/embedded/",
  production: "https://getsafepay.com/embedded/",
} as const;

function assertEnvHostConsistency(
  environment: "sandbox" | "production",
  host: string,
) {
  const isSandboxHost = host.includes("sandbox");
  if (environment === "sandbox" && !isSandboxHost) {
    throw new Error(
      "Safepay env mismatch: SAFEPAY_ENV=sandbox but host is not sandbox.api.getsafepay.com",
    );
  }
  if (environment === "production" && isSandboxHost) {
    throw new Error(
      "Safepay env mismatch: SAFEPAY_ENV=production but host is sandbox",
    );
  }
}

/** Official SDK sends secret as x-sfpy-merchant-secret — not Bearer. */
function merchantHeaders(secret: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-sfpy-merchant-secret": secret,
  };
}

async function fetchAuthToken(host: string, secret: string): Promise<string> {
  const authRes = await fetch(`${host}/client/passport/v1/token`, {
    method: "POST",
    headers: merchantHeaders(secret),
    body: JSON.stringify({}),
  });
  if (!authRes.ok) {
    const text = await authRes.text();
    throw new Error(`Safepay: auth token failed (${authRes.status}) ${text}`);
  }
  const authJson = (await authRes.json()) as { data?: string };
  const tbt = authJson.data;
  if (!tbt) throw new Error("Safepay: missing auth token");
  return tbt;
}

function buildCheckoutUrl(input: {
  environment: "sandbox" | "production";
  tracker: string;
  tbt: string;
  redirectUrl: string;
  cancelUrl: string;
}) {
  const params = new URLSearchParams({
    environment: input.environment,
    tracker: input.tracker,
    tbt: input.tbt,
    source: "hosted",
    redirect_url: input.redirectUrl,
    cancel_url: input.cancelUrl,
  });
  return `${checkoutHosts[input.environment]}?${params.toString()}`;
}

export function safepayGateway(
  environment: "sandbox" | "production",
): PaymentGateway {
  const apiKey = process.env.SAFEPAY_API_KEY!;
  const secret = process.env.SAFEPAY_SECRET_KEY!;
  const host = process.env.SAFEPAY_API_HOST || apiHosts[environment];
  assertEnvHostConsistency(environment, host);

  return {
    async createPayment(input: CreatePaymentInput) {
      const amount = Math.round(input.amountPkr * 100);

      const sessionRes = await fetch(`${host}/order/payments/v3/`, {
        method: "POST",
        headers: merchantHeaders(secret),
        body: JSON.stringify({
          merchant_api_key: apiKey,
          intent: "CYBERSOURCE",
          mode: "payment",
          currency: "PKR",
          amount,
          // Safepay only allows known meta keys (e.g. order_id) — custom keys 400
          metadata: {
            order_id: input.orderId,
          },
        }),
      });

      if (!sessionRes.ok) {
        const text = await sessionRes.text();
        throw new Error(`Safepay session failed: ${text}`);
      }

      const sessionJson = (await sessionRes.json()) as {
        data?: { tracker?: { token?: string } };
      };
      const tracker = sessionJson.data?.tracker?.token;
      if (!tracker) throw new Error("Safepay: missing tracker token");

      let tbt = await fetchAuthToken(host, secret);

      return {
        tracker,
        checkoutUrl: buildCheckoutUrl({
          environment,
          tracker,
          tbt,
          redirectUrl: input.redirectUrl,
          cancelUrl: input.cancelUrl,
        }),
        gateway: "safepay" as const,
        refreshCheckoutUrl: async () => {
          tbt = await fetchAuthToken(host, secret);
          return buildCheckoutUrl({
            environment,
            tracker,
            tbt,
            redirectUrl: input.redirectUrl,
            cancelUrl: input.cancelUrl,
          });
        },
      };
    },

    async verifyTracker(tracker: string) {
      const res = await fetch(
        `${host}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`,
        {
          headers: merchantHeaders(secret),
        },
      );
      if (!res.ok) return { success: false };
      const json = (await res.json()) as {
        data?: {
          state?: string;
          tracker?: { state?: string };
          amount?: number;
        };
      };
      // Reporter may nest state under tracker
      const state = json.data?.tracker?.state || json.data?.state;
      const success = state === "TRACKER_ENDED";
      const amountPkr =
        typeof json.data?.amount === "number"
          ? Math.round(json.data.amount / 100)
          : undefined;
      return { success, amountPkr, raw: json };
    },

    async refund(input: {
      tracker: string;
      amountPkr: number;
    }) {
      const amount = Math.round(input.amountPkr * 100);
      const res = await fetch(
        `${host}/order/payments/v3/${input.tracker}/refund`,
        {
          method: "POST",
          headers: merchantHeaders(secret),
          body: JSON.stringify({ amount }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Safepay refund failed: ${text}`);
      }
      return { success: true, raw: await res.json() };
    },
  };
}

/** Fresh TBT endpoint helper for checkout page load */
export async function issueSafepayClientToken(
  environment: "sandbox" | "production" = "sandbox",
) {
  const secret = process.env.SAFEPAY_SECRET_KEY;
  if (!secret || secret.includes("YOUR_")) {
    return { tbt: null as string | null, environment };
  }
  const host = process.env.SAFEPAY_API_HOST || apiHosts[environment];
  assertEnvHostConsistency(environment, host);
  const tbt = await fetchAuthToken(host, secret);
  return { tbt, environment, issuedAt: Date.now() };
}
