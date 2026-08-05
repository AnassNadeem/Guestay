import { ContactContent } from "@/components/contact/ContactContent";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFaqs, getSiteContact } from "@/lib/mock";
import { buildFaqPageJsonLd } from "@/lib/seo/schema";
import { CITY, NEIGHBORHOOD } from "@/lib/seo/site";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Contact Guestay",
  description: `Call or message Guestay in ${NEIGHBORHOOD}, ${CITY} about room availability, group stays, or monthly coliving bookings.`,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [contact, faqs] = await Promise.all([getSiteContact(), getFaqs()]);
  const faqLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <JsonLd data={faqLd} />
      <Suspense
        fallback={
          <div className="bg-paper pt-24 md:pt-28">
            <div className="container-page pb-16">
              <p className="text-ink-muted">Loading contact…</p>
            </div>
          </div>
        }
      >
        <ContactContent contact={contact} faqs={faqs} />
      </Suspense>
    </>
  );
}
