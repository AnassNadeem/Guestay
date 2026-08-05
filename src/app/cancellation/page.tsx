import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy",
  description: "Cancellation and refund rules for Guestay bookings.",
  alternates: { canonical: "/cancellation" },
};

export default function CancellationPage() {
  return (
    <div className="bg-paper pt-24 md:pt-28">
      <article className="container-page max-w-narrow pb-20">
        <p className="rounded-soft border border-olive/15 bg-white/80 px-4 py-3 text-sm text-ink-muted">
          <strong className="text-ink">Lawyer review required.</strong> Placeholder
          cancellation policy. Confirm windows and deposit rules with counsel
          before go-live.
        </p>
        <h1 className="mt-8 font-display text-4xl text-ink md:text-5xl">
          Cancellation &amp; Refunds
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
          Last updated · July 2026 · Lahore, Pakistan
        </p>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-ink-muted">
          <section>
            <h2 className="font-display text-xl text-ink">1. Soft holds</h2>
            <p>
              Unpaid holds expire automatically after two hours. No charge is
              taken for an expired hold.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">
              2. Guest cancellations
            </h2>
            <p>
              Cancel 7+ days before check-in for a full refund of stay amounts
              paid (less payment-provider fees if non-refundable). Within 7 days,
              stay payments are non-refundable unless we rebook the inventory.
              Security deposits follow inspection rules at checkout.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">3. Partial payments</h2>
            <p>
              If you paid a deposit / half payment, the remaining balance is due
              as stated on your confirmation. Failure to pay may cancel the
              booking under house policy.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">4. Group no-advance</h2>
            <p>
              Groups of 10+ confirmed without advance follow the written group
              agreement, which may differ from individual guest terms.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">5. Questions</h2>
            <p>
              <Link href="/contact" className="font-medium text-olive">
                Contact us
              </Link>{" "}
              or WhatsApp before cancelling so we can help.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
