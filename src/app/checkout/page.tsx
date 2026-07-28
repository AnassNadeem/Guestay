import { CheckoutForm } from "./CheckoutForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Guestay booking on one page.",
};

export default function CheckoutPage() {
  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page pb-20">
        <Suspense
          fallback={<p className="text-ink-muted">Loading checkout…</p>}
        >
          <CheckoutForm />
        </Suspense>
      </div>
    </div>
  );
}
