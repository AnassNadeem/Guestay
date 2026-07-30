"use client";

import { useCart } from "@/components/booking/CartProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const GRACE_SECONDS = Number(
  process.env.NEXT_PUBLIC_HOLD_GRACE_SECONDS || 90,
);

const HIDDEN_PATHS = ["/booking-summary", "/checkout", "/booking/"];

/** Hold-expiry session modal only — floating "Your Booking" pill removed in favor of nav My Bookings. */
export function BookingBadge() {
  const {
    soonestHoldExpiresAt,
    items,
    updateItem,
    clear,
  } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [sessionModal, setSessionModal] = useState(false);
  const [graceLeft, setGraceLeft] = useState(GRACE_SECONDS);
  const graceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const extendingId = useRef<string | null>(null);

  const hide =
    HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith("/booking/");

  const startGraceModal = useCallback(() => {
    setSessionModal(true);
    setGraceLeft(GRACE_SECONDS);
    if (graceTimer.current) clearInterval(graceTimer.current);
    graceTimer.current = setInterval(() => {
      setGraceLeft((s) => {
        if (s <= 1) {
          if (graceTimer.current) clearInterval(graceTimer.current);
          clear();
          toast("Your room hold expired — please search again");
          router.replace("/");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clear, router, toast]);

  useEffect(() => {
    if (!soonestHoldExpiresAt || hide) return;
    const warnMs = new Date(soonestHoldExpiresAt).getTime() - Date.now();
    if (warnMs <= 0) {
      startGraceModal();
      return;
    }
    const id = window.setTimeout(startGraceModal, warnMs);
    return () => clearTimeout(id);
  }, [soonestHoldExpiresAt, startGraceModal, hide]);

  async function keepRoom() {
    const soonest = soonestHoldExpiresAt;
    const target =
      items.find((i) => i.holdExpiresAt === soonest) ||
      items.find((i) => i.bookingId);
    if (!target?.bookingId) {
      setSessionModal(false);
      return;
    }
    extendingId.current = target.bookingId;
    const res = await fetch("/api/bookings/extend-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: target.bookingId }),
    });
    if (res.ok) {
      const data = await res.json();
      updateItem(target.id, { holdExpiresAt: data.holdExpiresAt });
    }
    if (graceTimer.current) clearInterval(graceTimer.current);
    setSessionModal(false);
  }

  return (
    <Modal
      open={sessionModal}
      onClose={() => undefined}
      title="Still there?"
      labelledBy="hold-grace-title"
    >
      <p className="text-sm text-ink-muted">
        Are you still there? We&apos;re about to release your room.
      </p>
      <p className="mt-2 font-mono text-sm text-olive">
        {graceLeft}s remaining
      </p>
      <button
        type="button"
        onClick={keepRoom}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50"
      >
        Keep My Room
      </button>
    </Modal>
  );
}
