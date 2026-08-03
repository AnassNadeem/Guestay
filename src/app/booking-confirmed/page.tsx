import { getBookingsByReference } from "@/lib/bookings/confirm";
import { getLocalBookingByTracker } from "@/lib/bookings/local-store";
import { isBookingSmtpConfigured } from "@/lib/mail/booking";
import { formatCurrency, formatDateLabel } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PaymentProcessing } from "./PaymentProcessing";

type Props = {
  searchParams: Promise<{
    ref?: string;
    scenario?: string;
    tracker?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Booking confirmed",
};

export const dynamic = "force-dynamic";

const TERMINAL = new Set([
  "paid",
  "partially_paid",
  "confirmed_no_advance",
  "cancelled",
]);

function scenarioMessage(
  scenario: string | undefined,
  smtpOk: boolean,
): { title: string; body: string } | null {
  if (scenario === "new_or_unclaimed") {
    return {
      title: "Check your email to set up your account",
      body: smtpOk
        ? "We sent a confirmation from bookings@guestay.pk, plus a separate email from noreply@guestay.pk with a 24-hour link to set your password. That link will not sign you in automatically."
        : "Save your booking reference. Account setup email will arrive once mail is configured.",
    };
  }
  if (scenario === "existing_claimed") {
    return {
      title: "Sign in to access your booking",
      body: "This stay is linked to your Guestay account. Sign in to view it under My Account.",
    };
  }
  if (scenario === "logged_in") {
    return {
      title: "Saved to your account",
      body: "You can view this booking anytime from My Account.",
    };
  }
  return null;
}

export default async function BookingConfirmedPage(props: Props) {
  const searchParams = await props.searchParams;
  const tracker = searchParams.tracker?.trim();
  const ref = searchParams.ref?.trim();

  // Legacy tracker-only URL (e.g. mid-poll refresh). Prefer ?ref= after return finalize.
  if (tracker && !ref) {
    const booking = await getLocalBookingByTracker(tracker);
    if (booking && TERMINAL.has(booking.status)) {
      const qs = new URLSearchParams({ ref: booking.reference });
      if (booking.accountLinkScenario) {
        qs.set("scenario", booking.accountLinkScenario);
      }
      redirect(`/booking-confirmed?${qs.toString()}`);
    }
    return <PaymentProcessing tracker={tracker} />;
  }

  if (!ref) notFound();

  const bookings = await getBookingsByReference(ref);
  if (bookings.length === 0) notFound();

  const primary = bookings[0]!;
  const scenario =
    searchParams.scenario || primary.accountLinkScenario || undefined;
  const smtpOk = isBookingSmtpConfigured();
  const hint = scenarioMessage(scenario, smtpOk);

  const amountPaid = bookings.reduce((s, b) => s + b.amountPaidPkr, 0);
  const amountDue = bookings.reduce((s, b) => s + b.amountDuePkr, 0);
  const paidAt =
    bookings.map((b) => b.paidAt).find(Boolean) ||
    (amountPaid > 0 ? primary.createdAt : undefined);

  const showMyBookings = scenario === "logged_in";
  const showSignIn = scenario === "existing_claimed";

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-narrow pb-20">
        <p className="text-eyebrow text-olive">Confirmed</p>
        <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">
          {primary.reference}
        </h1>
        <p className="mt-3 text-ink-muted">
          Thanks, {primary.guestName}. Your stay is confirmed.
        </p>

        <section className="mt-8 space-y-4">
          <h2 className="font-display text-xl text-ink">Your rooms</h2>
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="border-b border-olive/10 pb-3 last:border-0"
              >
                <p className="font-medium text-ink">{b.roomName}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {b.checkIn} → {b.checkOut}
                  {b.guestCount
                    ? ` · ${b.guestCount} guest${b.guestCount === 1 ? "" : "s"}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Status</dt>
            <dd className="font-medium text-ink">{primary.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Amount paid</dt>
            <dd className="font-mono text-ink">{formatCurrency(amountPaid)}</dd>
          </div>
          {paidAt && amountPaid > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Paid on</dt>
              <dd className="font-mono text-ink">{formatDateLabel(paidAt)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Still due</dt>
            <dd className="font-mono text-ink">{formatCurrency(amountDue)}</dd>
          </div>
        </dl>

        {hint && (
          <div className="mt-8 border-t border-olive/10 pt-6">
            <p className="font-medium text-ink">{hint.title}</p>
            <p className="mt-2 text-sm text-ink-muted">{hint.body}</p>
          </div>
        )}

        <p className="mt-6 text-sm text-ink-muted">
          A confirmation email is on its way to {primary.guestEmail}. Check-in:
          bring a valid government ID for each guest.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {showMyBookings && (
            <Link
              href="/account"
              className="inline-flex h-11 items-center rounded-full bg-olive px-6 text-sm font-medium text-cream-50"
            >
              My Account
            </Link>
          )}
          {showSignIn && (
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-full bg-olive px-6 text-sm font-medium text-cream-50"
            >
              Sign in
            </Link>
          )}
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
