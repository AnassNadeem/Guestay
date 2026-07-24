import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { getPromotions } from "@/lib/mock";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Promotions",
  description:
    "Book direct for 10% off your security deposit, or bring a group of 10+ with no advance payment.",
};

export default async function PromotionsPage() {
  const promotions = await getPromotions();
  const deposit = promotions.find((p) => p.kind === "deposit_discount");
  const group = promotions.find((p) => p.kind === "group_no_advance");

  return (
    <div className="bg-surface-warm pt-24 md:pt-28">
      <div className="container-page pb-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            Promotions
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-olive md:text-5xl">
            Straight deals for people who book with us
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            No points programs. Two offers that matter when you’re choosing a stay.
          </p>
        </div>
      </div>

      {deposit && (
        <Section className="!pt-6">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-sage-600">
                {deposit.valueLabel}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">
                {deposit.headline}
              </h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                {deposit.description}
              </p>
              <ul className="mt-6 space-y-2.5">
                {deposit.conditions.map((c) => (
                  <li
                    key={c}
                    className="flex gap-2 text-sm text-ink-muted before:mt-2 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-sage"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <Card className="bg-white" padding="lg">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
                Example · {deposit.exampleLabel}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-soft bg-cream-100 p-5">
                  <p className="text-xs uppercase tracking-wide text-ink-soft">
                    Marketplace deposit
                  </p>
                  <p className="mt-2 font-mono text-2xl text-ink-muted line-through decoration-olive/30">
                    {formatCurrency(deposit.exampleBefore)}
                  </p>
                </div>
                <div className="rounded-soft bg-olive p-5 text-cream-50">
                  <p className="text-xs uppercase tracking-wide text-sage">
                    Book direct
                  </p>
                  <p className="mt-2 font-mono text-2xl">
                    {formatCurrency(deposit.exampleAfter)}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm text-ink-muted">
                You save{" "}
                <span className="font-mono font-medium text-olive">
                  {formatCurrency(deposit.exampleBefore - deposit.exampleAfter)}
                </span>{" "}
                on the deposit for this room type — refundable under standard checkout.
              </p>
              <Link
                href="/rooms"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-olive hover:underline"
              >
                Choose a room
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>
        </Section>
      )}

      {group && (
        <Section className="border-t border-olive/8 bg-white">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <Card className="order-2 bg-surface-warm lg:order-1" padding="lg">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
                Example · {group.exampleLabel}
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-end justify-between border-b border-olive/10 pb-4">
                  <span className="text-sm text-ink-muted">Typical advance hold</span>
                  <span className="font-mono text-xl text-ink-muted line-through">
                    {formatCurrency(group.exampleBefore)}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-ink">
                    Due before arrival (Guestay groups)
                  </span>
                  <span className="font-mono text-3xl font-medium text-olive">
                    {formatCurrency(group.exampleAfter)}
                  </span>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-ink-muted">
                Payment settles at check-in under a signed group agreement. Ideal for
                retreats, teams, and reunions who need the rooms held first.
              </p>
            </Card>

            <div className="order-1 lg:order-2">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-sage-600">
                {group.valueLabel}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">
                {group.headline}
              </h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                {group.description}
              </p>
              <ul className="mt-6 space-y-2.5">
                {group.conditions.map((c) => (
                  <li
                    key={c}
                    className="flex gap-2 text-sm text-ink-muted before:mt-2 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-sage"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-olive hover:underline"
              >
                Plan a group stay
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
