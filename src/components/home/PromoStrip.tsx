import Link from "next/link";
import { ArrowRight, Percent, Users } from "lucide-react";

export function PromoStrip() {
  return (
    <section className="border-y border-olive/8 bg-olive text-cream-50">
      <div className="container-page flex flex-col gap-6 py-5 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex items-start gap-3">
            <Percent className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
            <p className="text-sm leading-snug md:text-[0.95rem]">
              <span className="font-medium">Direct bookings:</span> 10% off your
              security deposit.
            </p>
          </div>
          <div className="hidden h-8 w-px bg-cream-50/15 sm:block" />
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
            <p className="text-sm leading-snug md:text-[0.95rem]">
              <span className="font-medium">Groups of 10+:</span> stay with no
              advance payment.
            </p>
          </div>
        </div>
        <Link
          href="/promotions"
          className="inline-flex items-center gap-2 text-sm font-medium text-cream-50 transition-colors hover:text-sage"
        >
          How it works
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
