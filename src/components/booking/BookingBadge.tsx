"use client";

import { useCart } from "@/components/booking/CartProvider";
import { formatCurrency } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function BookingBadge() {
  const { count, totalPkr, justAdded } = useCart();
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    if (count > 0 && !entered) setEntered(true);
    if (count === 0) setEntered(false);
  }, [count, entered]);

  const bumped = count > prevCount.current;
  useEffect(() => {
    prevCount.current = count;
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="booking-badge"
          className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-auto"
          initial={
            reduced
              ? false
              : entered
                ? { opacity: 0, scale: 0.92 }
                : { opacity: 0, scale: 0.92 }
          }
          animate={{
            opacity: 1,
            scale: justAdded || bumped ? 1.04 : 1,
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            href="/booking-summary"
            className="flex items-center justify-between gap-4 rounded-full border border-olive/15 bg-ink px-5 py-3.5 text-cream-50 shadow-lift transition-transform hover:scale-[1.02] active:scale-[0.98] md:justify-start"
          >
            <span className="text-sm font-medium">
              Your Booking ({count}) · {formatCurrency(totalPkr)}
            </span>
            <span className="text-sm text-sage-200">Review →</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
