import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import {
  getLocalBooking,
  getLocalBookingByTracker,
  updateLocalBooking,
} from "@/lib/bookings/local-store";
import { getPaymentGateway } from "@/lib/payments/gateway";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Payment return",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tracker?: string; mock?: string; orderId?: string }>;
};

/**
 * Safepay / mock browser return.
 *
 * Testing stage: finalize to paid here after gateway.verifyTracker succeeds.
 * Webhook (/api/webhooks/safepay) remains as an optional idempotent backup
 * for production later — it is not required for confirmation right now.
 */
export default async function CheckoutReturnPage(props: Props) {
  const searchParams = await props.searchParams;
  const tracker = searchParams.tracker;
  if (!tracker) {
    return (
      <div className="bg-paper px-5 pb-20 pt-28">
        <p className="text-ink-muted">Missing payment tracker.</p>
      </div>
    );
  }

  const gateway = getPaymentGateway();
  const result = await gateway.verifyTracker(tracker);
  let booking = await getLocalBookingByTracker(tracker);
  if (!booking && searchParams.orderId) {
    booking = await getLocalBooking(searchParams.orderId);
  }

  if (!result.success || !booking) {
    return (
      <div className="bg-paper pt-24 md:pt-28">
        <div className="container-page max-w-narrow pb-20">
          <h1 className="font-display text-3xl text-ink">Payment incomplete</h1>
          <p className="mt-3 text-ink-muted">
            We could not confirm this payment yet. If you were charged, contact us
            with your tracker ID.
          </p>
          <p className="mt-2 font-mono text-sm text-ink-soft">{tracker}</p>
          <Link href="/rooms" className="mt-6 inline-block text-olive underline">
            Back to rooms
          </Link>
        </div>
      </div>
    );
  }

  const siblings = await getOrderBookings(booking);
  for (const b of siblings) {
    await updateLocalBooking(b.id, { gatewayTracker: tracker });
  }

  const amounts = siblings.map((b) => ({
    id: b.id,
    amountPaidPkr: b.subtotalPkr,
    amountDuePkr: 0,
  }));
  const finalized = await finalizeSuccessfulBooking({
    bookingId: booking.id,
    status: "paid",
    amounts,
    sessionUserId: booking.pendingSessionUserId || null,
  });
  const ref = finalized?.reference || booking.reference;
  const scenario = finalized?.scenario || "new_or_unclaimed";
  redirect(
    `/booking-confirmed?ref=${encodeURIComponent(ref)}&scenario=${encodeURIComponent(scenario)}`,
  );
}
