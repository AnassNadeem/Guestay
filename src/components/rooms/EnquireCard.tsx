"use client";

import { Card } from "@/components/ui/Card";
import { formatCurrency, whatsappHref } from "@/lib/utils";
import type { Room, SiteContact } from "@/types";
import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

export function EnquireCard({
  room,
  contact,
}: {
  room: Room;
  contact: SiteContact;
}) {
  const waMessage = `Hi Guestay, I'm interested in ${room.name}.`;

  return (
    <Card className="sticky top-24 border border-olive/8 bg-white/80 shadow-lift">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-sage-600">
        Interested in this room?
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
        Talk to us
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        From{" "}
        <span className="font-mono font-medium text-olive">
          {formatCurrency(room.priceFrom, room.currency)}
        </span>
        /month. Contact us for current availability and exact pricing.
      </p>

      <div className="mt-6 space-y-3">
        <a
          href={`tel:${contact.phone}`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-soft bg-olive text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
        >
          <Phone className="h-4 w-4" />
          Call {contact.phoneDisplay}
        </a>
        <a
          href={whatsappHref(contact.whatsapp, waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-soft border border-olive/20 bg-white text-sm font-medium text-olive transition-colors hover:bg-cream-100"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <Link
          href={`/contact?room=${room.slug}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-soft border border-olive/20 text-sm font-medium text-olive transition-colors hover:bg-cream-100"
        >
          Send a message
        </Link>
      </div>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-soft">
        No online checkout yet. A person confirms every stay.
      </p>
    </Card>
  );
}
