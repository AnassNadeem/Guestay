import type { Metadata } from "next";
import { CITY, NEIGHBORHOOD } from "@/lib/seo/site";
import RequestQuoteForm from "./RequestQuoteForm";

export const metadata: Metadata = {
  title: "Request a Quote",
  description: `Get a custom long-term quote for Guestay coliving in ${NEIGHBORHOOD}, ${CITY} — shared bedrooms and flats with clear monthly pricing.`,
  alternates: { canonical: "/request-quote" },
};

export default function RequestQuotePage() {
  return <RequestQuoteForm />;
}
