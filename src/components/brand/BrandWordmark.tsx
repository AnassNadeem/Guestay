import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
  showTagline?: boolean;
}

const sizes = {
  sm: "text-lg tracking-[0.08em]",
  md: "text-2xl tracking-[0.1em]",
  lg: "text-4xl tracking-[0.12em] md:text-5xl",
  hero: "text-[clamp(2.75rem,8vw,6.5rem)] tracking-[0.14em]",
};

/**
 * Logo wordmark with the intentional GUE / S / TAY color split.
 */
export function BrandWordmark({
  className,
  size = "md",
  showTagline = false,
}: BrandWordmarkProps) {
  return (
    <div className={cn("select-none", className)}>
      <p
        className={cn(
          "font-display font-bold uppercase leading-none",
          sizes[size],
        )}
        aria-label="Guestay"
      >
        <span className="text-sage">Gue</span>
        <span className="text-olive">s</span>
        <span className="text-sage">tay</span>
      </p>
      {showTagline && (
        <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.28em] text-olive sm:text-xs sm:tracking-[0.32em]">
          Shared spaces · Better living
        </p>
      )}
    </div>
  );
}
