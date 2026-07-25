import { Percent, Users } from "lucide-react";
import Link from "next/link";

export function PromoStrip() {
  return (
    <section className="border-y border-olive/10 bg-olive text-cream-50">
      <div className="container-page grid items-center gap-5 py-4 sm:grid-cols-2 sm:gap-8 md:py-5">
        <div className="flex items-center gap-3">
          <Percent className="h-5 w-5 shrink-0 text-sage" />
          <p className="text-sm leading-snug md:text-[0.95rem]">
            <span className="font-semibold tracking-wide">
              10% off security deposits
            </span>{" "}
            when you book direct.
          </p>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          <Users className="h-5 w-5 shrink-0 text-sage" />
          <p className="text-sm leading-snug md:text-[0.95rem]">
            <span className="font-semibold">Groups of 10+:</span> stay with no
            advance payment.{" "}
            <Link
              href="/contact"
              className="underline decoration-cream-50/30 underline-offset-4 transition-colors hover:text-sage hover:decoration-sage"
            >
              Ask us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
