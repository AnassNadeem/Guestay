"use client";

import { DateRangeCalendar } from "@/components/search/DateRangeCalendar";
import { NumberStepper } from "@/components/search/NumberStepper";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatDisplay(ymd: string | null, placeholder: string) {
  if (!ymd) return placeholder;
  try {
    return format(parseISO(ymd), "MMM d");
  } catch {
    return placeholder;
  }
}

export type SearchValues = {
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  rooms: number;
};

type PopoverPos = {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
};

const DATES_POPOVER_H = 360;
const GUESTS_POPOVER_H = 120;
const POPOVER_GAP = 10;
const VIEWPORT_PAD = 12;

function computePopoverPos(
  anchor: DOMRect,
  estimatedHeight: number,
  preferredWidth: number,
  centerUnder = false,
): PopoverPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(Math.max(preferredWidth, 280), vw - VIEWPORT_PAD * 2);

  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD;
  const spaceAbove = anchor.top - VIEWPORT_PAD;
  const placement: "above" | "below" =
    spaceBelow < estimatedHeight + POPOVER_GAP && spaceAbove > spaceBelow
      ? "above"
      : "below";

  const top =
    placement === "below"
      ? anchor.bottom + POPOVER_GAP
      : Math.max(
          VIEWPORT_PAD,
          anchor.top - estimatedHeight - POPOVER_GAP,
        );

  let left = centerUnder
    ? anchor.left + anchor.width / 2 - width / 2
    : anchor.left;
  left = Math.min(
    Math.max(VIEWPORT_PAD, left),
    vw - width - VIEWPORT_PAD,
  );

  return { top, left, width, placement };
}

export function SearchPill({
  initial,
  className,
  onSearch,
  compact = false,
}: {
  initial?: Partial<SearchValues>;
  className?: string;
  /** If provided, called instead of navigating */
  onSearch?: (values: SearchValues) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [checkIn, setCheckIn] = useState<string | null>(initial?.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(
    initial?.checkOut ?? null,
  );
  const [guests, setGuests] = useState(initial?.guests ?? 1);
  const [rooms, setRooms] = useState(initial?.rooms ?? 1);
  const [openSeg, setOpenSeg] = useState<"dates" | "guests" | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 743px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Outside-click: ignore clicks inside the pill OR the portaled popover
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpenSeg(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onDatesChange(ci: string | null, co: string | null) {
    setCheckIn(ci);
    setCheckOut(co);
    if (ci) {
      setDateError((err) =>
        err === "Please select a check-in date" ? null : err,
      );
    }
    if (ci && co) {
      setDateError(null);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        setOpenSeg(null);
        if (isMobile) setSheetOpen(false);
      }, 250);
    }
  }

  function submit(): boolean {
    if (!checkIn) {
      setDateError("Please select a check-in date");
      if (!isMobile && !compact) setOpenSeg("dates");
      else setSheetOpen(true);
      return false;
    }
    if (!checkOut) {
      setDateError("Please select a check-out date");
      if (!isMobile && !compact) setOpenSeg("dates");
      else setSheetOpen(true);
      return false;
    }
    setDateError(null);
    const values: SearchValues = { checkIn, checkOut, guests, rooms };
    if (onSearch) {
      onSearch(values);
      return true;
    }
    const params = new URLSearchParams();
    params.set("checkin", checkIn);
    params.set("checkout", checkOut);
    params.set("guests", String(guests));
    params.set("rooms", String(rooms));
    router.push(`/rooms?${params.toString()}`);
    return true;
  }

  const popoverMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18, ease: "easeOut" as const },
      };

  const sheetMotion = reduced
    ? {}
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);

  const updatePopoverPos = useCallback(() => {
    if (!openSeg || !wrapRef.current) {
      setPopoverPos(null);
      return;
    }
    const rect = wrapRef.current.getBoundingClientRect();
    if (openSeg === "dates") {
      setPopoverPos(
        computePopoverPos(
          rect,
          DATES_POPOVER_H,
          Math.min(rect.width, 340),
          false,
        ),
      );
    } else {
      setPopoverPos(
        computePopoverPos(rect, GUESTS_POPOVER_H, 280, true),
      );
    }
  }, [openSeg]);

  useLayoutEffect(() => {
    updatePopoverPos();
  }, [updatePopoverPos]);

  useEffect(() => {
    if (!openSeg) return;
    const onWin = () => updatePopoverPos();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [openSeg, updatePopoverPos]);

  // After mount, remeasure with actual popover height when available
  useLayoutEffect(() => {
    if (!openSeg || !popoverRef.current || !wrapRef.current) return;
    const measured = popoverRef.current.getBoundingClientRect().height;
    if (!measured) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const next =
      openSeg === "dates"
        ? computePopoverPos(
            rect,
            measured,
            Math.min(rect.width, 340),
            false,
          )
        : computePopoverPos(rect, measured, 280, true);
    setPopoverPos((prev) => {
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.placement === next.placement
      ) {
        return prev;
      }
      return next;
    });
  }, [openSeg, checkIn, checkOut]);

  const calendar = (
    <DateRangeCalendar
      checkIn={checkIn}
      checkOut={checkOut}
      onChange={onDatesChange}
      className="mx-auto max-w-[320px]"
    />
  );

  const steppers = (
    <div className="flex gap-8 p-5">
      <NumberStepper label="Guests" value={guests} min={1} max={30} onChange={setGuests} />
      <NumberStepper label="Rooms" value={rooms} min={1} max={10} onChange={setRooms} />
    </div>
  );

  const errorMessage = dateError ? (
    <p
      role="alert"
      className="mt-2 text-center text-sm font-medium text-red-600"
    >
      {dateError}
    </p>
  ) : null;

  if (isMobile || compact) {
    const sheet =
      typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {sheetOpen ? (
                <>
                  <motion.div
                    key="search-sheet-backdrop"
                    className="fixed inset-0 z-[90] bg-ink/40"
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSheetOpen(false)}
                  />
                  <motion.div
                    key="search-sheet"
                    className="fixed inset-x-0 bottom-0 z-[100] max-h-[92svh] overflow-y-auto rounded-t-[1.25rem] bg-cream-50 shadow-lift"
                    {...sheetMotion}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Search stays"
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-olive/10 bg-cream-50 px-5 py-4">
                      <p className="font-display text-lg text-ink">Search</p>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setSheetOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-olive hover:bg-sage/20"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {calendar}
                    {steppers}
                    <div className="sticky bottom-0 z-10 border-t border-olive/10 bg-cream-50 p-4">
                      {dateError && (
                        <p
                          role="alert"
                          className="mb-3 text-center text-sm font-medium text-red-600"
                        >
                          {dateError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (submit()) setSheetOpen(false);
                        }}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sage text-base font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Search className="h-5 w-5" />
                        Search
                      </button>
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null;

    return (
      <div className={cn("w-full", className)} ref={wrapRef}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center gap-3 rounded-full border border-olive/10 bg-white px-5 py-3.5 text-left shadow-lift transition-shadow hover:shadow-soft"
        >
          <Search className="h-5 w-5 shrink-0 text-sage" strokeWidth={2} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">
              {checkIn && checkOut
                ? `${formatDisplay(checkIn, "")} – ${formatDisplay(checkOut, "")}`
                : "When · Guests · Rooms"}
            </span>
            <span className="block text-xs text-ink-muted">
              {guests} guest{guests !== 1 ? "s" : ""} · {rooms} room
              {rooms !== 1 ? "s" : ""}
            </span>
          </span>
        </button>
        {errorMessage}
        {sheet}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full max-w-3xl", className)} ref={wrapRef}>
      <div className="flex items-stretch rounded-full border border-olive/10 bg-white shadow-lift">
        <button
          type="button"
          onClick={() => setOpenSeg(openSeg === "dates" ? null : "dates")}
          className={cn(
            "flex min-w-0 flex-[1.4] flex-col justify-center rounded-l-full px-6 py-3.5 text-left transition-colors hover:bg-cream-100/80",
            openSeg === "dates" && "bg-cream-100",
          )}
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
            Check-in
          </span>
          <span className="mt-0.5 truncate font-mono text-sm text-ink">
            {formatDisplay(checkIn, "Add date")}
          </span>
        </button>
        <div className="my-3 w-px bg-olive/10" />
        <button
          type="button"
          onClick={() => setOpenSeg(openSeg === "dates" ? null : "dates")}
          className={cn(
            "flex min-w-0 flex-[1.4] flex-col justify-center px-6 py-3.5 text-left transition-colors hover:bg-cream-100/80",
            openSeg === "dates" && "bg-cream-100",
          )}
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
            Check-out
          </span>
          <span className="mt-0.5 truncate font-mono text-sm text-ink">
            {formatDisplay(checkOut, "Add date")}
          </span>
        </button>
        <div className="my-3 w-px bg-olive/10" />
        <button
          type="button"
          onClick={() => setOpenSeg(openSeg === "guests" ? null : "guests")}
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center px-5 py-3.5 text-left transition-colors hover:bg-cream-100/80",
            openSeg === "guests" && "bg-cream-100",
          )}
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
            Guests
          </span>
          <span className="mt-0.5 font-mono text-sm text-ink">{guests}</span>
        </button>
        <div className="my-3 w-px bg-olive/10" />
        <button
          type="button"
          onClick={() => setOpenSeg(openSeg === "guests" ? null : "guests")}
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center px-5 py-3.5 text-left transition-colors hover:bg-cream-100/80",
            openSeg === "guests" && "bg-cream-100",
          )}
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
            Rooms
          </span>
          <span className="mt-0.5 font-mono text-sm text-ink">{rooms}</span>
        </button>
        <div className="flex items-center pr-2">
          <button
            type="button"
            aria-label="Search"
            onClick={submit}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white shadow-soft transition-transform duration-150 hover:scale-[1.05] active:scale-95"
          >
            <Search className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </div>
      {errorMessage}

      {typeof document !== "undefined" &&
        openSeg &&
        popoverPos &&
        createPortal(
          <AnimatePresence>
            {openSeg === "dates" && (
              <motion.div
                key="dates-pop"
                ref={popoverRef}
                className="fixed z-[80] overflow-hidden rounded-2xl border border-olive/10 bg-white shadow-lift"
                style={{
                  top: popoverPos.top,
                  left: popoverPos.left,
                  width: Math.max(popoverPos.width, 300),
                }}
                onMouseDown={(e) => e.stopPropagation()}
                {...popoverMotion}
                exit={
                  reduced
                    ? undefined
                    : {
                        opacity: 0,
                        transition: { duration: 0.12, ease: "easeIn" },
                      }
                }
              >
                {calendar}
              </motion.div>
            )}
            {openSeg === "guests" && (
              <motion.div
                key="guests-pop"
                ref={popoverRef}
                className="fixed z-[80] overflow-hidden rounded-2xl border border-olive/10 bg-white shadow-lift"
                style={{
                  top: popoverPos.top,
                  left: popoverPos.left,
                  width: popoverPos.width,
                }}
                onMouseDown={(e) => e.stopPropagation()}
                {...popoverMotion}
                exit={
                  reduced
                    ? undefined
                    : {
                        opacity: 0,
                        transition: { duration: 0.12, ease: "easeIn" },
                      }
                }
              >
                {steppers}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
