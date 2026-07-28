import { BadgePercent, KeyRound, PhoneCall, Sparkles, Users } from "lucide-react";

const items = [
  { icon: BadgePercent, text: "10% off your security deposit when you book direct" },
  { icon: Users, text: "Groups of 10 or more stay with no advance payment" },
  { icon: Sparkles, text: "Utilities, Wi-Fi, and weekly cleaning included" },
  { icon: PhoneCall, text: "Rooms held on a phone call — no marketplace fees" },
  { icon: KeyRound, text: "Furnished and move-in ready on Bedian Road" },
];

/**
 * Continuous left-moving ticker. The list is rendered twice so the
 * -50% keyframe loops seamlessly; hovering pauses it.
 */
export function PromoStrip() {
  return (
    <section
      className="group relative overflow-hidden border-y border-olive-700/40 bg-olive py-3.5 text-cream-50"
      aria-label="Current offers"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-olive to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-olive to-transparent sm:w-24" />

      <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
            {items.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex shrink-0 items-center gap-2.5 px-7 text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-sage" strokeWidth={1.75} />
                <span className="whitespace-nowrap text-cream-100/95">{text}</span>
                <span className="ml-7 h-1 w-1 shrink-0 rounded-full bg-sage/60" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
