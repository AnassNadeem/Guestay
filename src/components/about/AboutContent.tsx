"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef } from "react";
import type { TeamMember } from "@/types";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const values = [
  {
    title: "Clear rates",
    body: "Nightly and monthly prices on the page. Deposits listed. No surprise cleaning fees at checkout.",
  },
  {
    title: "Private when you need it",
    body: "A door that closes. Shared spaces for when you want company — not forced social calendars.",
  },
  {
    title: "House, not hostel theater",
    body: "Real kitchens, real laundry, short house rules. We optimize for living, not photo ops.",
  },
];

export function AboutContent({ team }: { team: TeamMember[] }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;

      if (storyRef.current) {
        const lines = storyRef.current.querySelectorAll("[data-reveal]");
        gsap.from(lines, {
          opacity: 0,
          y: 28,
          duration: 0.7,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: storyRef.current,
            start: "top 75%",
          },
        });
      }

      if (pinRef.current && window.innerWidth >= 1024) {
        const panels = pinRef.current.querySelectorAll("[data-value]");
        gsap.from(panels, {
          opacity: 0,
          x: 40,
          stagger: 0.15,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top 60%",
          },
        });
      }
    },
    { dependencies: [] },
  );

  return (
    <>
      <section className="relative overflow-hidden bg-olive pt-28 text-cream-50 md:pt-32">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(161,165,128,0.45), transparent 60%)",
          }}
        />
        <div className="container-page relative pb-16 md:pb-20">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage">
            About
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            Built for people who stay long enough to unpack.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-200 md:text-lg">
            Guestay started as one house with too many empty rooms and a hunch
            that coliving could feel quieter, clearer, and more adult.
          </p>
        </div>
      </section>

      <section className="bg-white py-section-sm md:py-section">
        <div className="container-page">
          <div
            ref={storyRef}
            className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-cream-200 shadow-soft">
              <Image
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
                alt="Sunlit shared living room with soft seating"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p
                data-reveal
                className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600"
              >
                Our story
              </p>
              <h2
                data-reveal
                className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl"
              >
                Less marketplace. More house.
              </h2>
              <p data-reveal className="mt-5 leading-relaxed text-ink-muted">
                We watched friends bounce between short-term rentals that charged
                hotel prices for empty apartments — and hostels that treated
                adults like backpackers. Guestay is the middle path: private
                rooms in a shared house, with rates you can plan a month around.
              </p>
              <p data-reveal className="mt-4 leading-relaxed text-ink-muted">
                The overlapping houses in our mark are intentional. You keep
                your own space. You share the life of the building. That balance
                is the whole product.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="values"
        ref={pinRef}
        className="bg-paper py-section-sm md:py-section"
      >
        <div className="container-page">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
              Values
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">
              What we won’t compromise
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {values.map((v, i) => (
              <div
                key={v.title}
                data-value
                className="border-t border-olive/15 pt-6"
              >
                <p className="font-mono text-xs text-sage-600">0{i + 1}</p>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="location" className="bg-white py-section-sm md:py-section">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
              Location
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">
              A quiet street, a walkable corner of town
            </h2>
            <p className="mt-4 leading-relaxed text-ink-muted">
              We’re in a residential pocket with grocery stores, a park, and a
              bus line within a few blocks. Exact address and transit notes are
              confirmed at booking — the map on Contact shows our working pin.
            </p>
            <p className="mt-4 text-sm text-ink-soft">
              Placeholder address: 1847 Willow Avenue, Oakridge, OR 97463
            </p>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden rounded-card bg-cream-200 shadow-soft">
            <Image
              src="https://images.unsplash.com/photo-1449844908441-88298767acb8?auto=format&fit=crop&w=1400&q=80"
              alt="Tree-lined residential street at golden hour"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-olive/8 bg-paper py-section-sm md:py-section">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
              Team
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink md:text-4xl">
              The people who keep the house running
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {team.map((member) => (
              <article key={member.id}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-cream-200">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">
                  {member.name}
                </h3>
                <p className="mt-1 text-sm text-sage-600">{member.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
