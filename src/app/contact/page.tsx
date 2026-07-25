import { ContactContent } from "@/components/contact/ContactContent";
import { getFaqs, getSiteContact } from "@/lib/mock";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Call or message Guestay about room availability, group stays, or monthly bookings.",
};

export default async function ContactPage() {
  const [contact, faqs] = await Promise.all([getSiteContact(), getFaqs()]);

  return (
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
  );
}
