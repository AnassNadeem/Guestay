import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Guestay collects and uses personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="bg-paper pt-24 md:pt-28">
      <article className="container-page max-w-narrow pb-20">
        <p className="rounded-soft border border-olive/15 bg-white/80 px-4 py-3 text-sm text-ink-muted">
          <strong className="text-ink">Lawyer review required.</strong> Placeholder
          privacy notice for a Pakistan-based coliving operator. Align with the
          Personal Data Protection Bill / applicable law before go-live.
        </p>
        <h1 className="mt-8 font-display text-4xl text-ink md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
          Last updated · July 2026 · Lahore, Pakistan
        </p>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-ink-muted">
          <section>
            <h2 className="font-display text-xl text-ink">1. Data we collect</h2>
            <p>
              Name, email, phone, booking dates, payment references (not full card
              numbers — handled by our payment provider), and messages you send
              via contact forms or WhatsApp.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">2. Why we use it</h2>
            <p>
              To confirm bookings, communicate check-in details, process payments,
              prevent fraud, and improve the Guestay service.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">3. Processors</h2>
            <p>
              We use hosting, database, email, and payment providers (e.g.
              Cloudflare, Supabase, Zoho, Safepay). They process data only to
              provide their services to us.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">4. Retention</h2>
            <p>
              Booking and payment records are kept as required for accounting and
              dispute resolution. You may request access or correction via{" "}
              <Link href="/contact" className="font-medium text-olive">
                Contact
              </Link>
              .
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">5. Contact</h2>
            <p>Privacy requests: hello@guestay.pk</p>
          </section>
        </div>
      </article>
    </div>
  );
}
