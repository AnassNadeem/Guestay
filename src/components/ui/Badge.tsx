import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "olive" | "sage" | "cream" | "available" | "limited" | "waitlist" | "booked";
}

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  olive: "bg-olive text-cream-50",
  sage: "bg-sage/25 text-olive-700",
  cream: "bg-cream-200 text-olive",
  available: "bg-sage/20 text-olive-700",
  limited: "bg-amber-50 text-amber-900 border border-amber-200/60",
  waitlist: "bg-cream-200 text-ink-muted",
  booked: "bg-olive/10 text-ink-muted",
};

export function Badge({
  className,
  tone = "sage",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
