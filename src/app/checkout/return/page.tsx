import {
  finalizeSuccessfulBooking,
  getOrderBookings,
} from "@/lib/bookings/confirm";
import { getLocalBookingByTracker } from "@/lib/bookings/local-store";
import { getPaymentGateway } from "@/lib/payments/gateway";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Payment return",
};

type Props = { searchParams: { tracker?: string; mock?: string; orderId?: string } };

export default async function CheckoutReturnPage({ searchParams }: Props) {
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
  const booking = getLocalBookingByTracker(tracker);

  if (result.success && booking) {
    const siblings = getOrderBookings(booking);
    const half = booking.paymentKind === "half";
    const status = half ? "partially_paid" : "paid";

    const amounts = siblings.map((b) => {
      const amountPaidPkr = half
        ? Math.ceil(b.subtotalPkr / 2)
        : b.subtotalPkr;
      return {
        id: b.id,
        amountPaidPkr,
        amountDuePkr: Math.max(0, b.subtotalPkr - amountPaidPkr),
      };
    });

    // Attach tracker to every line so webhook/return can find the order
    const { updateLocalBooking } = await import("@/lib/bookings/local-store");
    for (const b of siblings) {
      updateLocalBooking(b.id, { gatewayTracker: tracker });
    }

    const finalized = await finalizeSuccessfulBooking({
      bookingId: booking.id,
      status,
      amounts,
      // Prefer session stashed at reserve (survives Safepay redirect)
      sessionUserId: booking.pendingSessionUserId || null,
    });

    const ref = finalized?.reference || booking.reference;
    const scenario = finalized?.scenario || "new_or_unclaimed";
    redirect(
      `/booking-confirmed?ref=${encodeURIComponent(ref)}&scenario=${encodeURIComponent(scenario)}`,
    );
  }

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
