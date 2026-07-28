"use client";

import { Modal } from "@/components/ui/Modal";
import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  reference: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  amountPaidPkr: number;
  amountDuePkr: number;
  totalPkr: number;
  guestEmail: string;
};

type RefundTicket = {
  id: string;
  bookingId: string;
  amountPkr: number;
  reason: string;
  status: string;
  ownerNote?: string;
  createdAt: string;
};

function AccountInner() {
  const params = useSearchParams();
  const tab = params.get("tab") || "bookings";
  const [email, setEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [refunds, setRefunds] = useState<RefundTicket[]>([]);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState<BookingRow | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      let userEmail: string | null = null;
      if (hasSupabase()) {
        const sb = createBrowserSupabase();
        const { data } = await sb.auth.getUser();
        userEmail = data.user?.email ?? null;
        setEmail(userEmail);
        setFullName(
          (data.user?.user_metadata?.full_name as string) || "",
        );
      }
      const res = await fetch("/api/account/bookings");
      const data = await res.json();
      const all = (data.bookings || []) as BookingRow[];
      const mine = userEmail
        ? all.filter(
            (b) => b.guestEmail.toLowerCase() === userEmail!.toLowerCase(),
          )
        : all;
      setBookings(mine);

      try {
        const raw = localStorage.getItem("guestay_refunds_v1");
        if (raw) setRefunds(JSON.parse(raw) as RefundTicket[]);
      } catch {
        /* ignore */
      }
    }
    load();
  }, []);

  const upcoming = useMemo(
    () =>
      bookings.filter((b) =>
        ["paid", "partially_paid", "confirmed_no_advance", "pending_hold"].includes(
          b.status,
        ),
      ),
    [bookings],
  );

  function submitRefund() {
    if (!refundBooking || !reason.trim()) return;
    const ticket: RefundTicket = {
      id: `rf_${Date.now()}`,
      bookingId: refundBooking.id,
      amountPkr: refundBooking.amountPaidPkr,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
      ...(notes ? { ownerNote: undefined } : {}),
    };
    const next = [ticket, ...refunds];
    setRefunds(next);
    localStorage.setItem("guestay_refunds_v1", JSON.stringify(next));
    // Best-effort API
    void fetch("/api/refunds/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: refundBooking.id,
        amountPkr: refundBooking.amountPaidPkr,
        reason,
        notes,
      }),
    });
    setRefundOpen(false);
    setReason("");
    setNotes("");
    setMessage("Refund request submitted — Pending Review");
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!hasSupabase()) {
      setMessage("Settings saved locally (Supabase not configured).");
      return;
    }
    const sb = createBrowserSupabase();
    await sb.auth.updateUser({
      data: { full_name: fullName, phone },
    });
    setMessage("Account updated.");
  }

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-3xl pb-20">
        <h1 className="font-display text-3xl font-semibold text-ink">
          My Account
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {email || "Browsing as guest — sign in to sync bookings across devices."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["bookings", "My Bookings"],
              ["payments", "Payments"],
              ["refunds", "Request Refund"],
              ["settings", "Account Settings"],
            ] as const
          ).map(([id, label]) => (
            <a
              key={id}
              href={`/account?tab=${id}`}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === id
                  ? "bg-olive text-cream-50"
                  : "border border-olive/15 text-olive"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {message && (
          <p className="mt-4 rounded-soft bg-sage/20 px-3 py-2 text-sm text-olive">
            {message}
          </p>
        )}

        {tab === "bookings" && (
          <ul className="mt-8 space-y-3">
            {upcoming.length === 0 && (
              <li className="text-ink-muted">No bookings yet.</li>
            )}
            {upcoming.map((b) => (
              <li
                key={b.id}
                className="rounded-card border border-olive/10 bg-white/80 p-4 shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg text-ink">{b.roomName}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {b.reference} · {b.checkIn} → {b.checkOut}
                    </p>
                    <p className="mt-1 text-sm capitalize text-olive">
                      {b.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <a
                    href={`/booking/${b.reference}`}
                    className="text-sm text-olive underline"
                  >
                    View
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "payments" && (
          <ul className="mt-8 space-y-3">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="rounded-card border border-olive/10 bg-white/80 p-4"
              >
                <p className="font-medium text-ink">{b.roomName}</p>
                <p className="mt-1 font-mono text-sm text-ink-muted">
                  Paid {formatCurrency(b.amountPaidPkr)} · Due{" "}
                  {formatCurrency(b.amountDuePkr)}
                </p>
                {b.amountDuePkr > 0 && (
                  <a
                    href={`/checkout?room=&balance=${b.reference}`}
                    className="mt-2 inline-block text-sm font-medium text-olive underline"
                  >
                    Pay now
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === "refunds" && (
          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm text-ink-muted">
                Refunds require Owner approval. Select a paid booking to open a
                ticket.
              </p>
              <ul className="mt-4 space-y-2">
                {bookings
                  .filter((b) => b.amountPaidPkr > 0)
                  .map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setRefundBooking(b);
                          setRefundOpen(true);
                        }}
                        className="w-full rounded-card border border-olive/10 bg-white px-4 py-3 text-left text-sm hover:bg-cream-100"
                      >
                        {b.roomName} · {formatCurrency(b.amountPaidPkr)} paid
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-lg text-ink">Your tickets</h2>
              <ul className="mt-3 space-y-2">
                {refunds.length === 0 && (
                  <li className="text-sm text-ink-muted">No refund requests.</li>
                )}
                {refunds.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-soft border border-olive/10 bg-white/70 p-3 text-sm"
                  >
                    <p className="font-medium capitalize text-ink">
                      {r.status.replace(/_/g, " ")}
                    </p>
                    <p className="text-ink-muted">
                      {formatCurrency(r.amountPkr)} — {r.reason}
                    </p>
                    {r.ownerNote && (
                      <p className="mt-1 text-xs text-ink-soft">
                        Owner: {r.ownerNote}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <form onSubmit={saveSettings} className="mt-8 max-w-md space-y-3">
            <label className="block text-sm">
              <span className="text-ink-muted">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3"
              />
            </label>
            <p className="text-xs text-ink-soft">
              Avatar upload uses the same profile photo flow as admin (Supabase
              Storage) once credentials are connected.
            </p>
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-soft bg-olive px-6 text-sm font-medium text-cream-50"
            >
              Save settings
            </button>
          </form>
        )}
      </div>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Request Refund"
        labelledBy="refund-title"
      >
        <p className="text-sm text-ink-muted">
          {refundBooking?.roomName} —{" "}
          {formatCurrency(refundBooking?.amountPaidPkr || 0)}
        </p>
        <label className="mt-4 block text-sm">
          <span className="text-ink-muted">Reason</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-soft border border-olive/15 bg-white px-3 py-2"
            required
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-ink-muted">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-soft border border-olive/15 bg-white px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={submitRefund}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50"
        >
          Submit request
        </button>
      </Modal>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-20 text-ink-muted">Loading…</div>}>
      <AccountInner />
    </Suspense>
  );
}
