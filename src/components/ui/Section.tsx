import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: string;
  title?: string;
  description?: string;
  align?: "left" | "center";
  narrow?: boolean;
  actions?: ReactNode;
}

export function Section({
  className,
  eyebrow,
  title,
  description,
  align = "left",
  narrow = false,
  actions,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-section-sm md:py-section", className)} {...props}>
      <div className={cn("container-page", narrow && "max-w-narrow")}>
        {(eyebrow || title || description || actions) && (
          <div
            className={cn(
              "mb-10 md:mb-14",
              align === "center" && "mx-auto max-w-2xl text-center",
              actions && "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
            )}
          >
            <div className={cn(actions && align === "left" && "max-w-xl")}>
              {eyebrow && (
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl text-balance">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
                  {description}
                </p>
              )}
            </div>
            {actions}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
