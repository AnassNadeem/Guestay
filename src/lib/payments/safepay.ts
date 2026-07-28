import type { CreatePaymentInput, PaymentGateway } from "./gateway";

const hosts = {
  sandbox: "https://sandbox.api.getsafepay.com",
  production: "https://api.getsafepay.com",
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

async function fetchAuthToken(
  host: string,
  secret: string,
): Promise<string> {
  const authRes = await fetch(`${host}/client/passport/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
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

export function safepayGateway(
  environment: "sandbox" | "production",
): PaymentGateway {
  const apiKey = process.env.SAFEPAY_API_KEY!;
  const secret = process.env.SAFEPAY_SECRET_KEY!;
  const host = process.env.SAFEPAY_API_HOST || hosts[environment];
  assertEnvHostConsistency(environment, host);

  return {
    async createPayment(input: CreatePaymentInput) {
      const amount = Math.round(input.amountPkr * 100);

      const sessionRes = await fetch(`${host}/order/payments/v3/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          merchant_api_key: apiKey,
          intent: "CYBERSOURCE",
          mode: "payment",
          currency: "PKR",
          amount,
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

      // Fresh TBT at payment creation — never reuse across sessions
      let tbt = await fetchAuthToken(host, secret);

      const buildUrl = (token: string) => {
        const params = new URLSearchParams({
          tracker,
          tbt: token,
          environment,
          source: "popup",
          redirect_url: input.redirectUrl,
          cancel_url: input.cancelUrl,
        });
        return `${host}/checkout/?${params.toString()}`;
      };

      return {
        tracker,
        checkoutUrl: buildUrl(tbt),
        gateway: "safepay" as const,
        /** Allow caller to refresh TBT once on pay-time expiry */
        refreshCheckoutUrl: async () => {
          tbt = await fetchAuthToken(host, secret);
          return buildUrl(tbt);
        },
      };
    },

    async verifyTracker(tracker: string) {
      const res = await fetch(
        `${host}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`,
        {
          headers: { Authorization: `Bearer ${secret}` },
        },
      );
      if (!res.ok) return { success: false };
      const json = (await res.json()) as {
        data?: { state?: string; amount?: number };
      };
      const state = json.data?.state;
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
      const res = await fetch(`${host}/order/payments/v3/${input.tracker}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ amount }),
      });
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
  const host = process.env.SAFEPAY_API_HOST || hosts[environment];
  assertEnvHostConsistency(environment, host);
  const tbt = await fetchAuthToken(host, secret);
  return { tbt, environment, issuedAt: Date.now() };
}
