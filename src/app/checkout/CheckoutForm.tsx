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

const METHODS: { id: PayMethod; label: string; hint: string }[] = [
  { id: "jazzcash", label: "JazzCash", hint: "Mobile wallet" },
  { id: "easypaisa", label: "Easypaisa", hint: "Mobile wallet" },
  {
    id: "card",
    label: "Card",
    hint: "Visa / Mastercard / UnionPay / PayPak",
  },
  { id: "raast", label: "Raast", hint: "Bank transfer" },
];

const GRACE_SECONDS = Number(
  process.env.NEXT_PUBLIC_HOLD_GRACE_SECONDS || 90,
);

export function CheckoutForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { items: cartItems, clear: clearCart, soonestHoldExpiresAt } = useCart();
  const { toast } = useToast();

  const fromCart = params.get("cart") === "1";
  const room = params.get("room") || "";
  const mode = (params.get("mode") || "exclusive") as BookingMode;
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const guests = Number(params.get("guests") || 1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payOption, setPayOption] = useState<"full" | "half" | "none">("full");
  const [method, setMethod] = useState<PayMethod>("card");
  const [walletPhone, setWalletPhone] = useState("");
  const [tos, setTos] = useState(false);
  const [shakeTos, setShakeTos] = useState(false);
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [multiTotal, setMultiTotal] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [graceLeft, setGraceLeft] = useState(GRACE_SECONDS);
  const [safepayToken, setSafepayToken] = useState<string | null>(null);
  const holdCreated = useRef(false);
  const graceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshSafepayToken() {
    try {
      const res = await fetch("/api/payments/safepay-token", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.tbt) setSafepayToken(data.tbt as string);
      return (data.tbt as string) || null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    void refreshSafepayToken();
  }, []);

  // Prefer holds already created on Add / Book Now
  useEffect(() => {
    if (soonestHoldExpiresAt) {
      setHoldExpiresAt(soonestHoldExpiresAt);
      const withId = cartItems.find((i) => i.bookingId);
      if (withId?.bookingId) setBookingId(withId.bookingId);
      holdCreated.current = true;
    }
  }, [soonestHoldExpiresAt, cartItems]);

  const lines = useMemo(() => {
    if (fromCart && cartItems.length > 0) {
      return cartItems.map((i) => ({
        roomSlug: i.roomSlug,
        mode: i.bookingMode,
        checkIn: i.checkIn,
        checkOut: i.checkOut,
        guests: i.guests,
        roomName: i.roomName,
        subtotalPkr: i.subtotalPkr,
        nights: i.nights,
        effectivePerNightPkr: i.effectivePerNightPkr,
      }));
    }
    return null;
  }, [fromCart, cartItems]);

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

  // Create hold when guest lands on checkout (after guest fields filled, or on first interact)
  // Plan: create hold the moment they land — we create on mount with placeholder then update,
  // OR create when they submit. Plan says: "The moment a guest lands on /checkout ... create hold"
  // We'll create a soft hold when quote is ready using a session create endpoint.
  // For local flow, hold is created on reserve; we also start a client clock when holdExpiresAt set.
  // To match plan more closely: create hold ASAP via a lightweight start-session call after identity.

  const startGraceModal = useCallback(() => {
    setSessionModal(true);
    setGraceLeft(GRACE_SECONDS);
    if (graceTimer.current) clearInterval(graceTimer.current);
    graceTimer.current = setInterval(() => {
      setGraceLeft((s) => {
        if (s <= 1) {
          if (graceTimer.current) clearInterval(graceTimer.current);
          clearCart();
          toast("Your booking session expired — please search again");
          router.replace("/");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [clearCart, router, toast]);

  useEffect(() => {
    if (!holdExpiresAt) return;
    const warnMs = new Date(holdExpiresAt).getTime() - Date.now();
    if (warnMs <= 0) {
      startGraceModal();
      return;
    }
    const id = window.setTimeout(startGraceModal, warnMs);
    return () => clearTimeout(id);
  }, [holdExpiresAt, startGraceModal]);

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

  async function keepRoom() {
    if (!bookingId) {
      // Extend client-side clock if hold not yet server-created
      setHoldExpiresAt(
        new Date(Date.now() + Number(process.env.NEXT_PUBLIC_HOLD_MINUTES || 15) * 60000).toISOString(),
      );
      setSessionModal(false);
      if (graceTimer.current) clearInterval(graceTimer.current);
      return;
    }
    const res = await fetch("/api/bookings/extend-hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    if (res.ok) {
      const data = await res.json();
      setHoldExpiresAt(data.holdExpiresAt);
      setSessionModal(false);
      if (graceTimer.current) clearInterval(graceTimer.current);
    }
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
      // Silent token refresh if expired / missing before submit
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
            };

      const res = await fetch("/api/bookings/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = await res.json();

      // One silent retry with fresh Safepay token on payment gateway failure
      if (!res.ok && data.error?.toLowerCase?.().includes("safepay")) {
        await refreshSafepayToken();
        const retry = await fetch("/api/bookings/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        holdCreated.current = true;
      }

      if (
        data.booking.status === "confirmed_no_advance" ||
        payOption === "none" ||
        isGroup
      ) {
        clearCart();
        router.push(`/booking/${data.booking.reference}`);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      clearCart();
      router.push(`/booking/${data.booking.reference}`);
    } catch {
      setError(
        "Payment failed, you have not been charged — please try again or choose another method",
      );
    } finally {
      setLoading(false);
    }
  }

  // Start invisible hold clock when landing (client-side preview until reserve)
  useEffect(() => {
    if (holdCreated.current || holdExpiresAt) return;
    if (!(room && checkIn && checkOut) && !(lines && lines.length)) return;
    const mins = Number(process.env.NEXT_PUBLIC_HOLD_MINUTES || 15);
    setHoldExpiresAt(new Date(Date.now() + mins * 60 * 1000).toISOString());
  }, [room, checkIn, checkOut, lines, holdExpiresAt]);

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

              <fieldset>
                <legend className="mb-2 text-sm text-ink-muted">
                  Payment method
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {METHODS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors ${
                        method === m.id
                          ? "border-sage bg-sage/10"
                          : "border-olive/15 bg-white hover:bg-cream-100/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pay-method"
                        value={m.id}
                        checked={method === m.id}
                        onChange={() => setMethod(m.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-ink">
                          {m.label}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {m.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {(method === "jazzcash" || method === "easypaisa") && (
                <label className="block text-sm">
                  <span className="text-ink-muted">
                    Wallet mobile number
                  </span>
                  <input
                    required
                    type="tel"
                    value={walletPhone}
                    onChange={(e) => setWalletPhone(e.target.value)}
                    className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
                    placeholder="03XX XXXXXXX"
                  />
                  <span className="mt-1 block text-xs text-ink-soft">
                    PIN/OTP is entered inside Safepay&apos;s secure widget.
                  </span>
                </label>
              )}

              {method === "card" && (
                <div className="rounded-soft border border-olive/10 bg-cream-100/60 p-4 text-sm text-ink-muted">
                  Card details are collected in Safepay&apos;s secure hosted
                  fields after you confirm — the card number never touches our
                  servers.
                  {safepayToken ? (
                    <span className="mt-1 block text-xs text-olive">
                      Payment session ready
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs text-ink-soft">
                      Preparing secure session…
                    </span>
                  )}
                </div>
              )}

              {method === "raast" && (
                <p className="text-xs text-ink-soft">
                  You&apos;ll complete Raast inside Safepay&apos;s hosted
                  checkout — no bank details are collected on this page.
                </p>
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
              disabled={loading || !tos}
              className="inline-flex h-12 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] hover:bg-olive-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading
                ? "Processing…"
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
          <div className="mt-4 flex justify-between border-t border-olive/10 pt-4 text-sm text-ink-muted">
            {/* GST slot — add tax line here later without restructuring */}
            <span>Tax</span>
            <span className="font-mono">—</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-ink-muted">Due now</span>
            <span className="font-mono text-lg font-medium text-olive">
              {formatCurrency(amountNow)}
            </span>
          </div>
          <a
            href="/booking-summary"
            className="mt-4 inline-block text-sm text-olive underline"
          >
            Edit
          </a>
        </aside>
      </form>

      <Modal
        open={sessionModal}
        labelledBy="hold-modal-title"
        title="Are you still there?"
      >
        <p id="hold-modal-title" className="sr-only">
          Session about to expire
        </p>
        <p className="text-sm text-ink-muted">
          We&apos;re about to release your room. Keep your booking to continue
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
