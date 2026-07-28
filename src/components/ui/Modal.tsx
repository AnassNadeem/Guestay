"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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

  return (
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
            className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-olive/10 bg-cream-50 p-6 shadow-lift"
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            {title && (
              <h2
                id={labelledBy}
                className="font-display text-xl font-semibold text-ink"
              >
                {title}
              </h2>
            )}
            <div className={title ? "mt-3" : undefined}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
