"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { FaqItem, SiteContact } from "@/types";
import { ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import { FormEvent, useState } from "react";

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-olive/10 border-y border-olive/10">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className="font-display text-lg font-medium text-ink">
                {item.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-sage-600 transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-brand ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pr-8 text-sm leading-relaxed text-ink-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContactContent({
  contact,
  faqs,
}: {
  contact: SiteContact;
  faqs: FaqItem[];
}) {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page pb-16 md:pb-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            Contact
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-olive md:text-5xl">
            Tell us when you’re coming
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            Questions about rooms, group stays, or a longer monthly booking —
            send a note. We reply within one business day.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card padding="lg">
            {sent ? (
              <div className="flex min-h-[320px] flex-col items-start justify-center">
                <p className="font-display text-2xl font-semibold text-olive">
                  Thanks — we have your note
                </p>
                <p className="mt-3 max-w-md text-ink-muted">
                  Prefer email? Reach the house desk at{" "}
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-medium text-olive underline-offset-2 hover:underline"
                  >
                    {contact.email}
                  </a>
                  .
                </p>
                <Button
                  className="mt-6"
                  variant="outline"
                  type="button"
                  onClick={() => setSent(false)}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                      Name
                    </span>
                    <input
                      required
                      name="name"
                      className="w-full rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                      Email
                    </span>
                    <input
                      required
                      type="email"
                      name="email"
                      className="w-full rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
                      placeholder="you@email.com"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Topic
                  </span>
                  <select
                    name="topic"
                    className="w-full rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
                    defaultValue="rooms"
                  >
                    <option value="rooms">Room availability</option>
                    <option value="group">Group of 10+</option>
                    <option value="monthly">Monthly stay</option>
                    <option value="other">Something else</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Message
                  </span>
                  <textarea
                    required
                    name="message"
                    rows={5}
                    className="w-full resize-y rounded-soft border border-olive/10 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-olive/30"
                    placeholder="Dates, room preference, group size…"
                  />
                </label>
                <Button type="submit" size="lg">
                  Send message
                </Button>
              </form>
            )}
          </Card>

          <div className="space-y-6">
            <Card padding="lg" className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-sage-600" />
                <div>
                  <p className="font-medium text-ink">Visit</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {contact.addressLine1}
                    <br />
                    {contact.addressLine2}
                    <br />
                    {contact.city}, {contact.region} {contact.postalCode}
                  </p>
                  <p className="mt-2 text-xs text-ink-soft">{contact.hours}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-sage-600" />
                <div>
                  <p className="font-medium text-ink">Call</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="mt-1 block text-sm text-ink-muted hover:text-olive"
                  >
                    {contact.phoneDisplay}
                  </a>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-sage-600" />
                <div>
                  <p className="font-medium text-ink">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="mt-1 block text-sm text-ink-muted hover:text-olive"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            </Card>

            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card border border-olive/10 bg-cream-100">
              <div className="absolute inset-0 opacity-40">
                <div className="h-full w-full bg-[linear-gradient(to_right,#A1A58022_1px,transparent_1px),linear-gradient(to_bottom,#A1A58022_1px,transparent_1px)] bg-[size:28px_28px]" />
              </div>
              <div className="relative max-w-xs px-6 text-center">
                <MapPin className="mx-auto h-8 w-8 text-olive" />
                <p className="mt-3 font-display text-lg font-medium text-olive">
                  {contact.city}, {contact.region}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  Interactive map embeds after we lock the final address.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
            Common questions
          </h2>
          <div className="mt-8">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </div>
    </div>
  );
}
