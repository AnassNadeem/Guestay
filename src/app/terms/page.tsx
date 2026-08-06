import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Guestay coliving bookings in Pakistan.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="bg-paper pt-24 md:pt-28">
      <article className="container-page max-w-narrow pb-20">
        <p className="rounded-soft border border-olive/15 bg-white/80 px-4 py-3 text-sm text-ink-muted">
          <strong className="text-ink">Lawyer review required.</strong> This is
          placeholder legal copy for a Pakistan-based coliving business. Have a
          qualified lawyer review and revise before go-live.
        </p>
        <h1 className="mt-8 font-display text-4xl text-ink md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
          Last updated · July 2026 · Lahore, Pakistan
        </p>

        <div className="prose-guestay mt-10 space-y-6 text-base leading-relaxed text-ink-muted">
          <section>
            <h2 className="font-display text-xl text-ink">1. Who we are</h2>
            <p>
              Guestay operates shared accommodation and flats in Lahore Cantt,
              Pakistan. By booking through guestay.pk you agree to these Terms.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">2. Bookings</h2>
            <p>
              A booking is confirmed when payment succeeds (full or partial as
              offered) or when a qualifying group booking is confirmed with no
              advance. Soft holds expire after two hours if payment is not
              completed.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">3. Guest accounts</h2>
            <p>
              Accounts may be created automatically at booking. You are
              responsible for keeping login links and contact details accurate.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">4. House rules</h2>
            <p>
              Guests must follow posted house rules for each unit, including quiet
              hours and kitchen cleanliness. Breach may result in early
              termination without refund beyond what our Cancellation Policy
              allows.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">5. Liability</h2>
            <p>
              To the fullest extent permitted under Pakistani law, Guestay is not
              liable for indirect losses. Nothing in these Terms limits liability
              that cannot be limited by law.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">6. Contact</h2>
            <p>
              Questions:{" "}
              <Link href="/contact" className="font-medium text-olive">
                Contact us
              </Link>{" "}
              or email hello@guestay.pk.
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
