"use client";

import { siteConfig } from "@/lib/siteConfig";
import { Star } from "lucide-react";

/**
 * INTERIM: static Google rating badge + link to real Maps listing.
 * Replace with Places API–driven testimonials when credentials are live.
 */
export function GoogleReviews() {
  const rating = siteConfig.googleRating;

  return (
    <section className="bg-paper py-16 md:py-20" aria-labelledby="reviews-heading">
      <div className="container-page max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
          Google reviews
        </p>
        <h2
          id="reviews-heading"
          className="mt-2 font-display text-3xl text-ink md:text-4xl"
        >
          Rated by guests
        </h2>
        <div className="mt-6 inline-flex items-center gap-3 rounded-card border border-olive/10 bg-white/80 px-6 py-4 shadow-soft">
          <div className="flex items-center gap-1 text-olive" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(rating)
                    ? "fill-sage text-sage"
                    : "text-olive/20"
                }`}
              />
            ))}
          </div>
          <p className="font-mono text-2xl font-medium text-olive">
            {rating.toFixed(1)}
          </p>
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          <a
            href={siteConfig.googleMapsReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-olive underline-offset-2 hover:underline"
          >
            See our reviews on Google
          </a>
        </p>
      </div>
    </section>
  );
}
