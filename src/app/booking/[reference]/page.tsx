import { getLocalBooking } from "@/lib/bookings/local-store";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: { reference: string } };

export const metadata: Metadata = {
  title: "Booking confirmation",
};

export default function BookingConfirmationPage({ params }: Props) {
  const booking = getLocalBooking(params.reference);
  if (!booking) notFound();

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-narrow pb-20">
        <p className="text-eyebrow text-olive">Confirmed</p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Booking {booking.reference}
        </h1>
        <p className="mt-3 text-ink-muted">
          {booking.roomName} · {booking.checkIn} → {booking.checkOut}
        </p>

        <dl className="mt-8 space-y-3 rounded-card border border-olive/10 bg-white/80 p-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Status</dt>
            <dd className="font-medium text-ink">{booking.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Guest</dt>
            <dd className="text-ink">{booking.guestName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Paid</dt>
            <dd className="font-mono text-ink">
              {formatCurrency(booking.amountPaidPkr)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Still due</dt>
            <dd className="font-mono text-ink">
              {formatCurrency(booking.amountDuePkr)}
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-sm text-ink-muted">
          Check-in instructions and a magic-link account invite are emailed when
          SMTP is configured. Until then, save this reference.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/account"
            className="inline-flex h-11 items-center rounded-full bg-olive px-6 text-sm font-medium text-cream-50"
          >
            Guest account
          </Link>
          <Link
            href="/rooms"
            className="inline-flex h-11 items-center rounded-full border border-olive/20 px-6 text-sm font-medium text-olive"
          >
            Browse more rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
