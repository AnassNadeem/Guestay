import {
  Bath,
  Bike,
  Lock,
  Shirt,
  Snowflake,
  Sofa,
  Sparkles,
  Sun,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  title: string;
  description: string;
  icons: LucideIcon[];
  className: string;
  iconClassName: string;
};

const features: Feature[] = [
  {
    title: "Connect & cook",
    description:
      "Wi-Fi built for video calls and a full kitchen with shelf space that is yours alone.",
    icons: [Wifi, Utensils],
    className: "bg-white/70 text-ink",
    iconClassName: "bg-cream-200 text-olive",
  },
  {
    title: "Gather & breathe",
    description:
      "A lounge that feels like a home, not a lobby, plus rooftop chairs when you need air.",
    icons: [Sofa, Sun],
    className: "bg-sage/25 text-ink",
    iconClassName: "bg-sage/45 text-olive-700",
  },
  {
    title: "Daily ease",
    description:
      "In-house laundry, weekly cleaning of shared areas, and utilities already in the rate.",
    icons: [Shirt, Sparkles],
    className: "bg-olive text-cream-100",
    iconClassName: "bg-cream-50/15 text-cream-50",
  },
];

const included: { icon: LucideIcon; label: string }[] = [
  { icon: Zap, label: "Utilities included" },
  { icon: Snowflake, label: "Climate control" },
  { icon: Lock, label: "Personal locker" },
  { icon: Bath, label: "Ensuite options" },
  { icon: Bike, label: "Bike storage" },
  { icon: Sparkles, label: "Weekly cleaning" },
];

export function Amenities() {
  return (
    <section
      className="bg-cream-100 py-section-sm md:py-section"
      aria-labelledby="house-heading"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-eyebrow">The house</p>
          <h2
            id="house-heading"
            className="mt-3 font-serif text-3xl leading-tight text-ink md:text-[2.6rem]"
          >
            What you share, what stays yours
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            Private rooms stay private. Everything else — the kitchen, the
            lounge, the rooftop, the laundry — is kept ready so you can arrive
            with a suitcase and start living.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:gap-5 md:mt-12 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`flex flex-col gap-4 rounded-card p-6 shadow-soft transition-shadow duration-300 ease-brand hover:shadow-lift md:min-h-[15rem] md:p-7 ${feature.className}`}
            >
              <div className="flex gap-2">
                {feature.icons.map((Icon, i) => (
                  <span
                    key={i}
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${feature.iconClassName}`}
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
                  </span>
                ))}
              </div>
              <h3 className="font-serif text-2xl leading-snug text-current">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-current opacity-80">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-olive/10 pt-6 sm:grid-cols-3 lg:grid-cols-6">
          {included.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sm text-ink-muted"
            >
              <Icon className="h-4 w-4 shrink-0 text-sage-600" strokeWidth={1.75} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
