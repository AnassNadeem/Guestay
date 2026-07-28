"use client";

import { siteContact } from "@/lib/mock/content";
import { Percent, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY = "guestay-promo-dismissed";

export function PromoPopout() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setDismissed(false);

    // Hold off until the guest is well past the hero; the promo ticker
    // already carries these offers higher up the page.
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 1.6) {
        setVisible(true);
      }
    };

    const timer = window.setTimeout(() => setVisible(true), 20000);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    setModalOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null;

  return (
    <>
      <AnimatePresence>
        {visible && !modalOpen && (
          <motion.aside
            role="dialog"
            aria-label="Current promotions"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 right-5 z-40 w-[min(100%-2.5rem,22rem)] overflow-hidden rounded-card border border-olive/10 bg-cream shadow-lift"
          >
            <div className="flex items-start justify-between gap-3 border-b border-olive/10 bg-olive px-4 py-3 text-cream-50">
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-sage">
                Book direct
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-soft p-1 text-cream-50/80 transition-colors hover:bg-white/10 hover:text-cream-50"
                aria-label="Dismiss promotion"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex gap-3">
                <Percent className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                <p className="text-sm leading-snug text-ink">
                  10% off security deposits, booked direct
                </p>
              </div>
              <div className="flex gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
                <p className="text-sm leading-snug text-ink">
                  Groups of 10+ stay with no advance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-10 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
              >
                See offers
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-olive/40 p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal
              aria-labelledby="promo-modal-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md rounded-card border border-olive/10 bg-cream p-6 shadow-lift"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="promo-modal-title"
                  className="font-display text-xl font-semibold text-ink"
                >
                  Direct booking offers
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-soft p-1 text-ink-muted hover:bg-white/60"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-ink-muted">
                <li>
                  <span className="font-medium text-ink">
                    10% off security deposits
                  </span>
                  <br />
                  Book directly with Guestay and keep 10% of your listed deposit.
                </li>
                <li>
                  <span className="font-medium text-ink">
                    Groups of 10+: no advance
                  </span>
                  <br />
                  Confirm a block with a signed agreement and settle at arrival.
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/rooms"
                  onClick={dismiss}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-colors hover:bg-olive-700"
                >
                  Browse rooms
                </Link>
                <a
                  href={`tel:${siteContact.phone}`}
                  onClick={dismiss}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-soft border border-olive/20 text-sm font-medium text-olive transition-colors hover:bg-white/60"
                >
                  Call us
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
