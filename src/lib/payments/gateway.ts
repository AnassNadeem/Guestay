/**
 * Thin payment gateway interface — Safepay first, PayFast swappable later.
 */

export type CreatePaymentInput = {
  amountPkr: number;
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  redirectUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CreatePaymentResult = {
  tracker: string;
  checkoutUrl: string;
  gateway: "safepay" | "mock" | "payfast";
  /** Silently regenerate TBT + rebuild URL once if token expired at pay time */
  refreshCheckoutUrl?: () => Promise<string>;
};

export type PaymentGateway = {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyTracker(tracker: string): Promise<{
    success: boolean;
    amountPkr?: number;
    raw?: unknown;
  }>;
  refund?(input: {
    tracker: string;
    amountPkr: number;
  }): Promise<{ success: boolean; raw?: unknown }>;
};

export function getPaymentGateway(): PaymentGateway {
  const env = process.env.SAFEPAY_ENV || "sandbox";
  const apiKey = process.env.SAFEPAY_API_KEY;
  const secret = process.env.SAFEPAY_SECRET_KEY;

  if (
    apiKey &&
    secret &&
    !apiKey.includes("YOUR_") &&
    !secret.includes("YOUR_")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { safepayGateway } = require("./safepay") as typeof import("./safepay");
    return safepayGateway(env === "production" ? "production" : "sandbox");
  }

  return mockGateway;
}

const mockGateway: PaymentGateway = {
  async createPayment(input) {
    const tracker = `mock_track_${input.orderId}`;
    const base =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return {
      tracker,
      checkoutUrl: `${base}/checkout/return?tracker=${tracker}&mock=1&orderId=${encodeURIComponent(input.orderId)}`,
      gateway: "mock",
      refreshCheckoutUrl: async () =>
        `${base}/checkout/return?tracker=${tracker}&mock=1&orderId=${encodeURIComponent(input.orderId)}`,
    };
  },
  async verifyTracker(tracker) {
    return { success: tracker.startsWith("mock_track_"), amountPkr: undefined };
  },
  async refund() {
    return { success: true };
  },
};
