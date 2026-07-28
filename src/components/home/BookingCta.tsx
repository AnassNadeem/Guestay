import { siteContact } from "@/lib/mock/content";
import { whatsappHref } from "@/lib/utils";
import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    step: "01",
    title: "Pick dates",
    body: "Choose a unit, check-in and check-out. See your total before you commit.",
  },
  {
    step: "02",
    title: "Reserve & pay",
    body: "We hold the room for two hours. Pay in full or half on one checkout page.",
  },
  {
    step: "03",
    title: "Get confirmed",
    body: "Email confirmation, check-in instructions, and a magic link for your guest account.",
  },
];

export function BookingCta() {
  return (
    <section
      className="bg-olive py-section-sm text-cream-100 md:py-section"
      aria-labelledby="booking-heading"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-sage-200">
            How booking works
          </p>
          <h2
            id="booking-heading"
            className="mt-3 font-display text-3xl leading-tight text-cream-50 md:text-[2.6rem]"
          >
            Book online in three steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-cream-100">
            Self-serve checkout with a two-hour hold. Prefer a human? Call or
            WhatsApp — we quote the same rates you see on the site.
          </p>
        </div>

        <ol className="mt-10 grid gap-6 border-t border-cream-50/15 pt-8 md:grid-cols-3 md:gap-8">
          {steps.map((item) => (
            <li key={item.step}>
              <p className="font-display text-xl text-sage-200">{item.step}</p>
              <h3 className="mt-2 text-lg text-cream-50">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-100">
                {item.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/rooms"
            className="inline-flex h-11 items-center justify-center rounded-full bg-cream-50 px-6 text-sm font-medium text-olive hover:bg-white"
          >
            Browse rooms
          </Link>
          <a
            href={`tel:${siteContact.phone}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cream-50/30 px-6 text-sm font-medium text-cream-50 hover:bg-cream-50/10"
          >
            <Phone className="h-4 w-4" strokeWidth={2} />
            {siteContact.phoneDisplay}
          </a>
          <a
            href={whatsappHref(siteContact.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-cream-50/30 px-6 text-sm font-medium text-cream-50 hover:bg-cream-50/10"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
