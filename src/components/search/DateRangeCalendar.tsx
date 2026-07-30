"use client";

import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

function parseYmd(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function DateRangeCalendar({
  checkIn,
  checkOut,
  onChange,
  className,
}: {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  className?: string;
}) {
  const start = parseYmd(checkIn);
  const end = parseYmd(checkOut);
  const [month, setMonth] = useState(() => start ?? new Date());
  const [hover, setHover] = useState<Date | null>(null);
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const previewEnd = end ?? (start && hover && !isBefore(hover, start) ? hover : null);

  function selectDay(day: Date) {
    if (isBefore(day, today)) return;
    if (!start || (start && end)) {
      onChange(toYmd(day), null);
      setHover(null);
      return;
    }
    if (isBefore(day, start) || isSameDay(day, start)) {
      onChange(toYmd(day), null);
      return;
    }
    onChange(toYmd(start), toYmd(day));
  }

  return (
    <div className={cn("mx-auto w-full max-w-[320px] select-none p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-olive transition-colors hover:bg-sage/20"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-base font-medium text-ink">
          {format(month, "MMMM yyyy")}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-olive transition-colors hover:bg-sage/20"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[0.65rem] font-medium uppercase tracking-wider text-ink-soft">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const disabled = isBefore(day, today);
          const isStart = start && isSameDay(day, start);
          const isEnd = end && isSameDay(day, end);
          const inRange =
            start &&
            previewEnd &&
            !isBefore(day, start) &&
            !isBefore(previewEnd, day) &&
            !isStart &&
            !isEnd;
          const selected = isStart || isEnd;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled || !inMonth}
              onClick={() => selectDay(day)}
              onMouseEnter={() => {
                if (start && !end && !disabled) setHover(day);
              }}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors duration-150",
                !inMonth && "invisible",
                disabled && "cursor-not-allowed text-ink-soft/40",
                !disabled && !selected && "text-ink hover:bg-sage/25",
                inRange && "bg-sage/20 text-ink",
                selected && "bg-sage text-white hover:bg-sage-600",
                isToday(day) && !selected && "ring-1 ring-olive/40 ring-inset",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
