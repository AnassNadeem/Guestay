import { getBookingsByReference } from "@/lib/bookings/confirm";
import { getLocalBooking } from "@/lib/bookings/local-store";
import { isFinalBookingReference } from "@/lib/bookings/reference";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ reference: string }> };

export const metadata: Metadata = {
  title: "Booking confirmation",
};

/**
 * Legacy confirmation URL — redirects to /booking-confirmed when the stay
 * is finalized; otherwise shows hold state (reference still HOLD-…).
 */
export default async function BookingConfirmationPage(props: Props) {
  const params = await props.params;
  const booking = await getLocalBooking(params.reference);
  if (!booking) notFound();

  if (
    isFinalBookingReference(booking.reference) &&
    ["paid", "partially_paid", "confirmed_no_advance"].includes(booking.status)
  ) {
    const scenario = booking.accountLinkScenario || "";
    redirect(
      `/booking-confirmed?ref=${encodeURIComponent(booking.reference)}${
        scenario ? `&scenario=${encodeURIComponent(scenario)}` : ""
      }`,
    );
  }

  const rooms = await getBookingsByReference(booking.reference);
  const list = rooms.length > 0 ? rooms : [booking];

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-narrow pb-20">
        <p className="text-eyebrow text-olive">Booking</p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          {booking.reference}
        </h1>
        <p className="mt-3 text-ink-muted">
          Status: {booking.status}. Your final booking reference appears once
          payment succeeds.
        </p>

        <ul className="mt-8 space-y-3 text-sm">
          {list.map((b) => (
            <li key={b.id}>
              <span className="font-medium text-ink">{b.roomName}</span>
              <span className="text-ink-muted">
                {" "}
                · {b.checkIn} → {b.checkOut}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Paid</dt>
            <dd className="font-mono">
              {formatCurrency(
                list.reduce((s, b) => s + b.amountPaidPkr, 0),
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Still due</dt>
            <dd className="font-mono">
              {formatCurrency(list.reduce((s, b) => s + b.amountDuePkr, 0))}
            </dd>
          </div>
        </dl>

        <Link
          href="/rooms"
          className="mt-8 inline-flex h-11 items-center rounded-full border border-olive/20 px-6 text-sm font-medium text-olive"
        >
          Browse rooms
        </Link>
      </div>
    </div>
  );
}
