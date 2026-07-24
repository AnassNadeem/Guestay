import { ContactContent } from "@/components/contact/ContactContent";
import { getFaqs, getSiteContact } from "@/lib/mock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach Guestay about room availability, group stays, or monthly bookings.",
};

export default async function ContactPage() {
  const [contact, faqs] = await Promise.all([getSiteContact(), getFaqs()]);
  return <ContactContent contact={contact} faqs={faqs} />;
}
