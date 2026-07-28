"use client";

import { Section } from "@/components/ui/Section";
import type { Testimonial } from "@/types";
import { Star } from "lucide-react";
import Image from "next/image";

/** Google Maps place URL for Guestay Apartments. */
const GOOGLE_MAPS_REVIEWS_URL = "https://maps.app.goo.gl/WeV5BdTF3UPjTi8H8";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-[#FABB05] text-[#FABB05]" : "fill-cream-200 text-cream-200"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ item }: { item: Testimonial }) {
  return (
    <article className="flex w-[min(85vw,20rem)] shrink-0 flex-col rounded-card border border-olive/8 bg-white/75 p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Image
          src={item.avatar}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{item.name}</p>
          <p className="truncate text-xs text-ink-soft">{item.location}</p>
        </div>
        <GoogleMark className="h-5 w-5 shrink-0" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Stars rating={item.rating} />
        <span className="text-xs text-ink-soft">{item.stayDuration}</span>
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-muted">
        {item.quote}
      </p>
    </article>
  );
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: Testimonial[];
  reverse?: boolean;
}) {
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden">
      <div
        className={`flex w-max gap-4 group-hover/reviews:[animation-play-state:paused] ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        }`}
      >
        {loop.map((item, i) => (
          <ReviewCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function GoogleReviews({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;

  const avg =
    items.reduce((sum, t) => sum + t.rating, 0) / Math.max(items.length, 1);

  return (
    <Section
      className="overflow-hidden bg-paper"
      eyebrow="Guest reviews"
      title="Trusted by the people who lived here"
      description="Notes from guests who stayed a month or a season. Every review is tied to a real stay."
      actions={
        <a
          href={GOOGLE_MAPS_REVIEWS_URL}
          className="inline-flex items-center gap-2 text-sm font-medium text-olive underline-offset-4 hover:underline"
        >
          <GoogleMark className="h-4 w-4" />
          See all on Google
        </a>
      }
    >
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-card border border-olive/8 bg-white/70 px-5 py-4 shadow-soft">
        <GoogleMark className="h-8 w-8" />
        <div>
          <p className="font-serif text-lg text-ink">Guestay</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-ink">
              {avg.toFixed(1)}
            </span>
            <Stars rating={Math.round(avg)} />
            <span className="text-sm text-ink-soft">
              · {items.length} reviews
            </span>
          </div>
        </div>
      </div>

      <div className="group/reviews relative -mx-5 sm:-mx-6 lg:-mx-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-cream to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-cream to-transparent sm:w-20" />
        <MarqueeRow items={items} />
      </div>
    </Section>
  );
}
