"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

export function NumberStepper({
  label,
  value,
  min = 1,
  max = 20,
  onChange,
  className,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-olive/20 text-olive transition-all duration-150 hover:scale-[1.02] hover:bg-sage/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="min-w-[1.5rem] text-center font-mono text-base font-medium text-ink tabular-nums">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-olive/20 text-olive transition-all duration-150 hover:scale-[1.02] hover:bg-sage/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
