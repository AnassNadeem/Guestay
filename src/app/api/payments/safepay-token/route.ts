import { issueSafepayClientToken } from "@/lib/payments/safepay";
import { NextResponse } from "next/server";

/** Fresh Safepay TBT for checkout — never cache across users/sessions. */
export async function GET() {
  try {
    const env =
      process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
    const result = await issueSafepayClientToken(env);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token failed", tbt: null },
      { status: 500 },
    );
  }
}
