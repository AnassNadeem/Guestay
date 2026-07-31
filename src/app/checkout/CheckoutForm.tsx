"use client";

import { useCart } from "@/components/booking/CartProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/utils";
import type { BookingMode } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QuotePayload = {
  nights: number;
  staySubtotalPkr: number;
  depositDuePkr: number;
  halfPaymentPkr: number;
  fullPaymentPkr: number;
  effectivePerNightPkr: number;
  isGroupNoAdvance: boolean;
  roomName: string;
};

type PayMethod = "jazzcash" | "easypaisa" | "card" | "raast";

const GRACE_SECONDS = Number(
  process.env.NEXT_PUBLIC_HOLD_GRACE_SECONDS || 60,
);
const HOLD_MINUTES = Number(process.env.NEXT_PUBLIC_HOLD_MINUTES || 10);

export function CheckoutForm() {
  const params = useSearchParams();
  const router = useRouter();
  const fromCart = params.get("cart") === "1";
  const selectedIds = useMemo(() => {
    const raw = params.get("ids");
    if (!raw) return null;
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return ids.length > 0 ? ids : null;
  }, [params]);
  const room = params.get("room") || "";
  const mode = (params.get("mode") || "exclusive") as BookingMode;
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const guests = Number(params.get("guests") || 1);

  const {
    items: cartItems,
    clear: clearCart,
    removeItem,
    updateItem,
    clearHoldMeta,
    hydrated: cartHydrated,
  } = useCart();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payOption, setPayOption] = useState<"full" | "half" | "none">("full");
  const [method] = useState<PayMethod>("card");
  const [tos, setTos] = useState(false);
  const [shakeTos, setShakeTos] = useState(false);
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [multiTotal, setMultiTotal] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holdLeftSec, setHoldLeftSec] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [holdLoading, setHoldLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [graceLeft, setGraceLeft] = useState(GRACE_SECONDS);
  const [safepayToken, setSafepayToken] = useState<string | null>(null);
  const [safepayStatus, setSafepayStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const holdStarted = useRef(false);
  const graceActive = useRef(false);
  const graceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshSafepayToken() {
    try {
      const res = await fetch("/api/payments/safepay-token", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.tbt) {
        setSafepayToken(data.tbt as string);
        setSafepayStatus("ready");
        return data.tbt as string;
      }
      setSafepayStatus("unavailable");
      return null;
    } catch {
      setSafepayStatus("unavailable");
      return null;
    }
  }

  useEffect(() => {
    void refreshSafepayToken();
  }, []);

  const checkoutItems = useMemo(() => {
    if (!fromCart) return [];
    if (selectedIds?.length) {
      return cartItems.filter((i) => selectedIds.includes(i.id));
    }
    return cartItems;
  }, [fromCart, cartItems, selectedIds]);

  const lines = useMemo(() => {
    if (checkoutItems.length > 0) {
      return checkoutItems.map((i) => ({
        cartItemId: i.id,
        roomSlug: i.roomSlug,
        mode: i.bookingMode,
        checkIn: i.checkIn,
        checkOut: i.checkOut,
        guests: i.guests,
        roomName: i.roomName,
        subtotalPkr: i.subtotalPkr,
        nights: i.nights,
        effectivePerNightPkr: i.effectivePerNightPkr,
        bookingId: i.bookingId,
      }));
    }
    return null;
  }, [checkoutItems]);

  function clearCheckoutItems() {
    if (checkoutItems.length > 0) {
      for (const item of checkoutItems) {
        removeItem(item.id);
      }
      return;
    }
    // Single-room checkout: only drop the matching Saved item, keep the rest
    if (room && checkIn && checkOut) {
      const match = cartItems.find(
        (i) =>
          i.roomSlug === room &&
          i.checkIn === checkIn &&
          i.checkOut === checkOut &&
          i.bookingMode === mode,
      );
      if (match) removeItem(match.id);
      return;
    }
    clearCart();
  }

  useEffect(() => {
    async function load() {
      if (lines && lines.length > 0) {
        setMultiTotal(lines.reduce((s, l) => s + l.subtotalPkr, 0));
        const totalGuests = lines.reduce((s, l) => s + l.guests, 0);
        if (totalGuests >= 10) setPayOption("none");
        return;
      }
      if (!room || !checkIn || !checkOut) return;
      const res = await fetch(
        `/api/quote?room=${encodeURIComponent(room)}&mode=${mode}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      );
      if (!res.ok) {
        setError("Could not price this stay. Check your dates.");
        return;
      }
      const data = await res.json();
      setQuote(data);
      if (data.isGroupNoAdvance) setPayOption("none");
    }
    load();
  }, [room, mode, checkIn, checkOut, guests, lines]);

  // Create real inventory holds when landing on checkout (after cart hydrates)
  useEffect(() => {
    if (holdStarted.current) return;
    if (!cartHydrated) return;

    const snapshot = fromCart ? checkoutItems : [];
    const canStart =
      (fromCart && snapshot.length > 0) ||
      (room && checkIn && checkOut);
    if (!canStart) {
      if (fromCart && cartHydrated && snapshot.length === 0) {
        if (selectedIds?.length && cartItems.length > 0) {
          setError(
            "Those rooms are no longer in your Saved list. Go back and choose again.",
          );
          setHoldLoading(false);
          return;
        }
        // Still waiting for cart hydrate / items
        return;
      }
      setHoldLoading(false);
      return;
    }

    holdStarted.current = true;
    let cancelled = false;

    async function startHolds() {
      setHoldLoading(true);
      setError(null);
      try {
        const payloadLines =
          fromCart && snapshot.length > 0
            ? snapshot.map((l) => ({
                cartItemId: l.id,
                roomSlug: l.roomSlug,
                mode: l.bookingMode,
                checkIn: l.checkIn,
                checkOut: l.checkOut,
                guests: l.guests,
                previousBookingId: l.bookingId,
              }))
            : [
                {
                  cartItemId: `direct-${room}-${checkIn}`,
                  roomSlug: room,
                  mode,
                  checkIn,
                  checkOut,
                  guests,
                },
              ];

        const res = await fetch("/api/bookings/start-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: payloadLines }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          const detail =
            data.results?.find(
              (r: { available?: boolean; reason?: string }) => !r.available,
            )?.reason || data.error;
          setError(
            detail ||
              "One or more rooms are no longer available. Update your Saved list and try again.",
          );
          setHoldLoading(false);
          return;
        }

        for (const hold of data.holds as Array<{
          cartItemId: string;
          bookingId: string;
          holdExpiresAt: string | null;
          reference?: string;
          nights?: number;
          ratePerNightPkr?: number;
          subtotalPkr?: number;
          effectivePerNightPkr?: number;
          bedsBooked?: number;
        }>) {
          const match = snapshot.find((i) => i.id === hold.cartItemId);
          if (match) {
            updateItem(match.id, {
              bookingId: hold.bookingId,
              holdExpiresAt: hold.holdExpiresAt,
              reference: hold.reference,
              nights: hold.nights ?? match.nights,
              ratePerNightPkr: hold.ratePerNightPkr ?? match.ratePerNightPkr,
              subtotalPkr: hold.subtotalPkr ?? match.subtotalPkr,
              effectivePerNightPkr:
                hold.effectivePerNightPkr ?? match.effectivePerNightPkr,
              bedsBooked: hold.bedsBooked ?? match.bedsBooked,
            });
          }
        }

        if (data.holds?.[0]?.bookingId) {
          setBookingId(data.holds[0].bookingId as string);
        }
        if (data.holdExpiresAt) {
          setHoldExpiresAt(data.holdExpiresAt as string);
        } else {
          setHoldExpiresAt(null);
        }

        if (data.results?.length && fromCart && snapshot.length > 0) {
          setMultiTotal(
            data.results.reduce(
              (s: number, r: { subtotalPkr: number }) => s + r.subtotalPkr,
              0,
            ),
          );
        } else if (data.results?.[0] && !(fromCart && snapshot.length > 0)) {
          const r = data.results[0];
          setQuote((q) =>
            q
              ? {
                  ...q,
                  nights: r.nights,
                  staySubtotalPkr: r.subtotalPkr,
                  effectivePerNightPkr: r.effectivePerNightPkr,
                  roomName: r.roomName,
                }
              : q,
          );
        }
      } catch {
        if (!cancelled) {
          setError("Could not reserve rooms for checkout. Please try again.");
        }
      } finally {
        if (!cancelled) setHoldLoading(false);
      }
    }

    void startHolds();
    return () => {
      cancelled = true;
    };
    // Start once when cart is ready — do not re-run when items patch after hold
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHydrated, fromCart, checkoutItems.length, room, checkIn, checkOut]);

  // Live countdown while hold is active
  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldLeftSec(null);
      return;
    }
    function tick() {
      const left = Math.max(
        0,
        Math.ceil((new Date(holdExpiresAt!).getTime() - Date.now()) / 1000),
      );
      setHoldLeftSec(left);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  const startGraceModal = useCallback(() => {
    if (graceActive.current) return;
    graceActive.current = true;
    setSessionModal(true);
    setGraceLeft(GRACE_SECONDS);
    if (graceTimer.current) clearInterval(graceTimer.current);
    graceTimer.current = setInterval(() => {
      setGraceLeft((s) => {
        if (s <= 1) {
          if (graceTimer.current) clearInterval(graceTimer.current);
          graceActive.current = false;
          clearHoldMeta();
          setHoldExpiresAt(null);
          setBookingId(null);
          setSessionModal(false);
          toast(
            "Hold expired — your Saved rooms are still here, but are no longer locked",
          );
          router.replace("/booking-summary");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clearHoldMeta, router, toast]);

  useEffect(() => {
    if (!holdExpiresAt || sessionModal) return;
    const warnMs = new Date(holdExpiresAt).getTime() - Date.now();
    if (warnMs <= 0) {
      startGraceModal();
      return;
    }
    const id = window.setTimeout(startGraceModal, warnMs);
    return () => clearTimeout(id);
  }, [holdExpiresAt, startGraceModal, sessionModal]);

  const amountNow = useMemo(() => {
    if (lines && multiTotal != null) {
      if (payOption === "none") return 0;
      if (payOption === "half") return Math.ceil(multiTotal / 2);
      return multiTotal;
    }
    if (!quote) return 0;
    if (payOption === "none") return 0;
    if (payOption === "half") return quote.halfPaymentPkr;
    return quote.fullPaymentPkr;
  }, [quote, payOption, lines, multiTotal]);

  const isGroup =
    payOption === "none" ||
    quote?.isGroupNoAdvance ||
    (lines != null && lines.reduce((s, l) => s + l.guests, 0) >= 10);

  const addRoomsHref = useMemo(() => {
    const ci = lines?.[0]?.checkIn || checkIn;
    const co = lines?.[0]?.checkOut || checkOut;
    const g = lines?.[0]?.guests || guests;
    if (ci && co) {
      return `/rooms?checkin=${encodeURIComponent(ci)}&checkout=${encodeURIComponent(co)}&guests=${g}`;
    }
    return "/rooms";
  }, [lines, checkIn, checkOut, guests]);

  async function keepRoom() {
    const ids = checkoutItems
      .map((i) => i.bookingId)
      .filter((id): id is string => Boolean(id));
    const targetIds = ids.length > 0 ? ids : bookingId ? [bookingId] : [];

    if (targetIds.length === 0) {
      const next = new Date(
        Date.now() + HOLD_MINUTES * 60 * 1000,
      ).toISOString();
      setHoldExpiresAt(next);
      graceActive.current = false;
      setSessionModal(false);
      if (graceTimer.current) clearInterval(graceTimer.current);
      return;
    }

    let soonest: string | null = null;
    let ok = true;
    for (const id of targetIds) {
      const res = await fetch("/api/bookings/extend-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (!res.ok) {
        ok = false;
        continue;
      }
      const data = await res.json();
      const match = checkoutItems.find((i) => i.bookingId === id);
      if (match) updateItem(match.id, { holdExpiresAt: data.holdExpiresAt });
      if (
        data.holdExpiresAt &&
        (!soonest ||
          new Date(data.holdExpiresAt).getTime() < new Date(soonest).getTime())
      ) {
        soonest = data.holdExpiresAt;
      }
    }

    if (!ok || !soonest) {
      toast("Could not extend your hold — try again");
      return;
    }

    setHoldExpiresAt(soonest);
    graceActive.current = false;
    setSessionModal(false);
    if (graceTimer.current) clearInterval(graceTimer.current);
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!tos) {
      setShakeTos(true);
      window.setTimeout(() => setShakeTos(false), 500);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Hard availability + price re-check immediately before payment
      const checkLines =
        lines && lines.length > 0
          ? lines.map((l) => ({
              roomSlug: l.roomSlug,
              mode: l.mode,
              checkIn: l.checkIn,
              checkOut: l.checkOut,
              guests: l.guests,
              excludeBookingId: l.bookingId,
            }))
          : [
              {
                roomSlug: room,
                mode,
                checkIn,
                checkOut,
                guests,
                excludeBookingId: bookingId || undefined,
              },
            ];

      const checkRes = await fetch("/api/bookings/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: checkLines }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        throw new Error(
          checkData.results?.find(
            (r: { available?: boolean; reason?: string }) => !r.available,
          )?.reason ||
            checkData.error ||
            "Rooms are no longer available",
        );
      }

      if (checkData.results?.length && lines) {
        setMultiTotal(checkData.totalPkr);
        for (const r of checkData.results as Array<{
          roomSlug: string;
          subtotalPkr: number;
          nights: number;
          effectivePerNightPkr: number;
          ratePerNightPkr: number;
          bedsBooked: number;
        }>) {
          const match = checkoutItems.find((i) => i.roomSlug === r.roomSlug);
          if (match) {
            updateItem(match.id, {
              subtotalPkr: r.subtotalPkr,
              nights: r.nights,
              effectivePerNightPkr: r.effectivePerNightPkr,
              ratePerNightPkr: r.ratePerNightPkr,
              bedsBooked: r.bedsBooked,
            });
          }
        }
      }

      if (!safepayToken && !isGroup) {
        await refreshSafepayToken();
      }

      const payload =
        lines && lines.length > 0
          ? {
              lines: lines.map((l) => ({
                roomSlug: l.roomSlug,
                mode: l.mode,
                checkIn: l.checkIn,
                checkOut: l.checkOut,
                guests: l.guests,
                holdBookingId: l.bookingId,
              })),
              guestName: name,
              guestEmail: email,
              guestPhone: phone,
              payOption: isGroup ? "none" : payOption,
              preferredPaymentMethod: method,
            }
          : {
              roomSlug: room,
              mode,
              checkIn,
              checkOut,
              guests,
              guestName: name,
              guestEmail: email,
              guestPhone: phone,
              payOption: isGroup ? "none" : payOption,
              preferredPaymentMethod: method,
              holdBookingId: bookingId || undefined,
            };

      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      try {
        const { hasSupabase, createBrowserSupabase } = await import(
          "@/lib/supabase/client"
        );
        if (hasSupabase()) {
          const { data: sessionData } =
            await createBrowserSupabase().auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) authHeaders.Authorization = `Bearer ${token}`;
        }
      } catch {
        /* auth optional */
      }

      const res = await fetch("/api/bookings/reserve", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      let data = await res.json();

      if (!res.ok && data.error?.toLowerCase?.().includes("safepay")) {
        await refreshSafepayToken();
        const retry = await fetch("/api/bookings/reserve", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        data = await retry.json();
        if (!retry.ok) throw new Error(data.error || "Payment failed");
      } else if (!res.ok) {
        throw new Error(data.error || "Payment failed");
      }

      setBookingId(data.booking.id);
      if (data.booking.holdExpiresAt) {
        setHoldExpiresAt(data.booking.holdExpiresAt);
      }

      const confirmedRef =
        data.reference || data.booking?.reference || data.order?.reference;
      const scenario = data.accountLinkScenario as string | undefined;

      if (
        data.booking.status === "confirmed_no_advance" ||
        payOption === "none" ||
        isGroup
      ) {
        clearCheckoutItems();
        const qs = new URLSearchParams({ ref: confirmedRef });
        if (scenario) qs.set("scenario", scenario);
        router.push(`/booking-confirmed?${qs.toString()}`);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      clearCheckoutItems();
      if (confirmedRef) {
        const qs = new URLSearchParams({ ref: confirmedRef });
        if (scenario) qs.set("scenario", scenario);
        router.push(`/booking-confirmed?${qs.toString()}`);
      } else {
        router.push(`/booking/${data.booking.reference}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment failed, you have not been charged — please try again or choose another method",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!lines?.length && (!room || !checkIn || !checkOut)) {
    return (
      <p className="text-ink-muted">
        Missing booking details.{" "}
        <a href="/rooms" className="text-olive underline">
          Choose a room
        </a>
        .
      </p>
    );
  }

  function formatHoldClock(totalSec: number) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <>
      <form
        onSubmit={onConfirm}
        className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl text-ink md:text-4xl">
              Checkout
            </h1>
            {holdLoading ? (
              <p className="mt-2 text-sm text-ink-muted">
                Confirming availability and locking your rooms…
              </p>
            ) : holdLeftSec != null ? (
              <p className="mt-2 font-mono text-sm text-olive">
                Rooms held for {formatHoldClock(holdLeftSec)}
              </p>
            ) : null}
          </div>

          <section className="space-y-3">
            <h2 className="font-display text-xl text-ink">Guest details</h2>
            <label className="block text-sm">
              <span className="text-ink-muted">Full name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Phone</span>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
              />
            </label>
          </section>

          {!isGroup && (
            <section className="space-y-4">
              <h2 className="font-display text-xl text-ink">Payment</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPayOption("full")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-[1.02] ${
                    payOption === "full"
                      ? "bg-olive text-cream-50"
                      : "border border-olive/20 text-olive"
                  }`}
                >
                  Pay in full
                </button>
                <button
                  type="button"
                  onClick={() => setPayOption("half")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-[1.02] ${
                    payOption === "half"
                      ? "bg-olive text-cream-50"
                      : "border border-olive/20 text-olive"
                  }`}
                >
                  Pay 50% deposit now
                </button>
              </div>

              <div className="rounded-soft border border-olive/10 bg-cream-100/60 p-4 text-sm text-ink-muted">
                <p className="font-medium text-ink">Pay with card (Safepay)</p>
                <p className="mt-1">
                  You&apos;ll be redirected to Safepay&apos;s secure page for Visa /
                  Mastercard (Google Pay may also appear). Card details never
                  touch our servers.
                </p>
                <p className="mt-2 text-xs text-ink-soft">
                  JazzCash, Easypaisa, and Raast are not enabled on this sandbox
                  account yet — those show after Safepay activates them on your
                  live merchant account.
                </p>
              </div>

              {safepayStatus === "loading" && (
                <p className="text-xs text-ink-soft">
                  Connecting to payment provider…
                </p>
              )}
              {safepayStatus === "unavailable" && (
                <p className="rounded-soft bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Payment provider is temporarily unavailable. You can still
                  confirm — we&apos;ll retry when you pay. If it keeps failing,
                  contact us on WhatsApp.
                </p>
              )}
              {safepayStatus === "ready" && (
                <p className="text-xs text-olive">Payment provider ready</p>
              )}
            </section>
          )}

          {isGroup && (
            <section className="rounded-card border border-sage/40 bg-sage/10 p-4 text-sm text-ink">
              Group booking (10+ guests): no advance payment required. Confirm
              your booking and settle on arrival.
            </section>
          )}

          <label
            className={`flex items-start gap-3 text-sm text-ink-muted ${
              shakeTos ? "animate-[shake_0.4s_ease]" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={tos}
              onChange={(e) => setTos(e.target.checked)}
              className="mt-1"
            />
            <span>
              I agree to the{" "}
              <a href="/terms" className="text-olive underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/cancellation" className="text-olive underline">
                cancellation policy
              </a>
              .
            </span>
          </label>

          {error && (
            <p className="rounded-soft bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="sticky bottom-0 z-20 -mx-5 border-t border-olive/10 bg-cream-50/95 p-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <button
              type="submit"
              disabled={loading || holdLoading || !tos}
              className="inline-flex h-12 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading
                ? "Confirming availability…"
                : holdLoading
                  ? "Locking rooms…"
                  : isGroup
                    ? "Confirm Booking (No Advance Required)"
                    : `Confirm and Pay · ${formatCurrency(amountNow)}`}
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-card border border-olive/10 bg-white/80 p-5 shadow-soft lg:sticky lg:top-24">
          <h2 className="font-display text-xl text-ink">Order summary</h2>
          <ul className="mt-4 space-y-4">
            {lines?.length ? (
              lines.map((l, idx) => (
                <li key={idx} className="border-b border-olive/8 pb-3 text-sm">
                  <p className="font-medium text-ink">{l.roomName}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {l.checkIn} → {l.checkOut} · {l.nights} nights
                  </p>
                  <p className="mt-1 font-mono text-olive">
                    {formatCurrency(l.subtotalPkr)}
                  </p>
                </li>
              ))
            ) : quote ? (
              <li className="text-sm">
                <p className="font-medium text-ink">{quote.roomName}</p>
                <p className="font-mono text-xs text-ink-muted">
                  {checkIn} → {checkOut} · {quote.nights} nights
                </p>
                <p className="mt-1 text-ink-muted">
                  {formatCurrency(quote.effectivePerNightPkr)}/night effective
                </p>
                <p className="mt-2 font-mono text-olive">
                  {formatCurrency(quote.staySubtotalPkr)}
                </p>
              </li>
            ) : (
              <li className="text-sm text-ink-muted">Loading quote…</li>
            )}
          </ul>
          <div className="mt-4 flex justify-between border-t border-olive/10 pt-4">
            <span className="text-ink-muted">Due now</span>
            <span className="font-mono text-lg font-medium text-olive">
              {formatCurrency(amountNow)}
            </span>
          </div>
          {holdLeftSec != null && (
            <p className="mt-4 rounded-soft bg-cream-100/80 px-3 py-2 font-mono text-xs text-olive">
              Hold ends in {formatHoldClock(holdLeftSec)}
            </p>
          )}
          <a
            href={addRoomsHref}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-soft border border-olive/20 bg-white text-sm font-medium text-olive transition-all hover:scale-[1.02] hover:bg-cream-100 active:scale-[0.98]"
          >
            Add more rooms
          </a>
          <a
            href="/booking-summary"
            className="mt-3 inline-block text-sm text-olive underline"
          >
            Edit Saved
          </a>
        </aside>
      </form>

      <Modal
        open={sessionModal}
        labelledBy="hold-modal-title"
        title="Still there?"
      >
        <p id="hold-modal-title" className="sr-only">
          Hold about to expire
        </p>
        <p className="text-sm text-ink-muted">
          We&apos;re about to release your rooms. Keep your hold to finish
          checkout.
        </p>
        <div className="mt-5 flex items-center justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="rgba(59,68,48,0.15)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="#A6AC7E"
                strokeWidth="3"
                strokeDasharray={`${(graceLeft / GRACE_SECONDS) * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="font-mono text-lg text-ink">{graceLeft}s</span>
          </div>
        </div>
        <button
          type="button"
          onClick={keepRoom}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Keep My Room
        </button>
      </Modal>
    </>
  );
}
