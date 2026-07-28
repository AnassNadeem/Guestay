import { getLocalBookingByTracker, updateLocalBooking } from "@/lib/bookings/local-store";
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
    const kind = booking.paymentKind === "half" ? "half" : "full";
    const paid =
      kind === "half"
        ? Math.ceil(booking.subtotalPkr * 0.5)
        : booking.subtotalPkr;
    updateLocalBooking(booking.id, {
      status: kind === "half" ? "partially_paid" : "paid",
      amountPaidPkr: paid,
      amountDuePkr: Math.max(0, booking.subtotalPkr - paid),
      holdExpiresAt: null,
    });
    redirect(`/booking/${booking.reference}`);
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
