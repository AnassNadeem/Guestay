"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Centered dialog portaled to document.body (same pattern as SearchPill
 * date popovers) so ancestor overflow/transform never clips it.
 * Clamps vertically when viewport is short and scrolls body content.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  labelledBy?: string;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-ink/45"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="fixed left-1/2 z-[100] flex max-h-[min(90vh,40rem)] w-[min(92vw,28rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-olive/10 bg-cream-50 p-6 shadow-lift"
            style={{
              top: "50%",
              transform: "translate(-50%, -50%)",
              maxHeight: "min(90vh, 40rem)",
            }}
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            {title && (
              <h2
                id={labelledBy}
                className="shrink-0 font-display text-xl font-semibold text-ink"
              >
                {title}
              </h2>
            )}
            <div
              className={`min-h-0 flex-1 overflow-y-auto ${title ? "mt-3" : ""}`}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
