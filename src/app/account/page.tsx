"use client";

import { AccountSettings } from "@/components/account/AccountSettings";
import { Modal } from "@/components/ui/Modal";
import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type BookingRow = {
  id: string;
  reference: string;
  roomName: string;
  roomSlug?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guestCount?: number;
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isCancelled(b: BookingRow) {
  return b.status === "cancelled" || b.status === "expired_hold";
}

function isUpcoming(b: BookingRow, today: string) {
  // Active stays (checked in, not yet out) count as upcoming too
  return !isCancelled(b) && b.checkOut >= today && b.status !== "completed";
}

function isPast(b: BookingRow, today: string) {
  return b.checkOut < today || b.status === "completed";
}

function canRequestRefund(b: BookingRow, tickets: RefundTicket[]) {
  if (!["paid", "partially_paid"].includes(b.status)) return false;
  if (isCancelled(b)) return false;
  if (b.amountPaidPkr <= 0) return false;
  const open = tickets.find(
    (t) =>
      t.bookingId === b.id &&
      !["denied", "refunded"].includes(t.status.toLowerCase()),
  );
  return !open;
}

function ticketForBooking(b: BookingRow, tickets: RefundTicket[]) {
  return tickets.find((t) => t.bookingId === b.id);
}

function EmptyState({
  icon: Icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="mt-12 flex flex-col items-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-olive/15 bg-olive/[0.06]">
        <Icon className="h-7 w-7 text-olive" strokeWidth={1.5} />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-ink-muted">{body}</p>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex h-11 items-center rounded-soft bg-olive px-6 text-sm font-medium text-cream-50 transition-all hover:bg-olive/90"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function BookingMenu({
  booking,
  upcoming,
  refunds,
  onManage,
  onRefund,
}: {
  booking: BookingRow;
  upcoming: boolean;
  refunds: RefundTicket[];
  onManage: () => void;
  onRefund: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const showManage = upcoming && !isCancelled(booking);
  const showRefund = canRequestRefund(booking, refunds);
  const ticket = ticketForBooking(booking, refunds);
  const showTicketStatus =
    ticket &&
    !showRefund &&
    ["paid", "partially_paid"].includes(booking.status);
  const hasMenu = showManage || showRefund || showTicketStatus;

  useEffect(() => {
    if (!hasMenu) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [hasMenu]);

  if (!hasMenu) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Booking actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-soft text-ink-muted transition-colors hover:bg-cream-100 hover:text-ink"
      >
        <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[11rem] overflow-hidden rounded-soft border border-olive/10 bg-white py-1 shadow-lift">
          {showManage && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onManage();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream-100"
            >
              <Pencil className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
              Manage Booking
            </button>
          )}
          {showRefund && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRefund();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-cream-100"
            >
              <Wallet className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
              Request Refund
            </button>
          )}
          {showTicketStatus && ticket && (
            <p className="px-3 py-2 text-xs capitalize text-ink-muted">
              Refund: {ticket.status.replace(/_/g, " ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  siblings,
  upcoming,
  refunds,
  onManage,
  onRefund,
}: {
  booking: BookingRow;
  siblings: BookingRow[];
  upcoming: boolean;
  refunds: RefundTicket[];
  onManage: () => void;
  onRefund: () => void;
}) {
  const rooms = siblings.length > 0 ? siblings : [booking];
  return (
    <li className="rounded-card border border-olive/10 bg-white/80 p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-medium text-ink">
            {booking.reference}
          </p>
          <ul className="mt-2 space-y-1.5">
            {rooms.map((r) => (
              <li key={r.id}>
                <p className="font-display text-base text-ink">{r.roomName}</p>
                <p className="text-xs text-ink-muted">
                  {r.checkIn} → {r.checkOut}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm capitalize text-olive">
            {booking.status.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/booking-confirmed?ref=${encodeURIComponent(booking.reference)}`}
            className="px-2 text-sm text-olive underline"
          >
            View
          </Link>
          <BookingMenu
            booking={booking}
            upcoming={upcoming}
            refunds={refunds}
            onManage={onManage}
            onRefund={onRefund}
          />
        </div>
      </div>
    </li>
  );
}

function AccountInner() {
  const params = useSearchParams();
  const rawTab = params.get("tab") || "bookings";
  const tab = rawTab === "refunds" ? "bookings" : rawTab;
  const [email, setEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [refunds, setRefunds] = useState<RefundTicket[]>([]);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState<BookingRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageBooking, setManageBooking] = useState<BookingRow | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editGuests, setEditGuests] = useState(1);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [settingsVisited, setSettingsVisited] = useState(false);

  useEffect(() => {
    if (tab === "settings") setSettingsVisited(true);
  }, [tab]);

  useEffect(() => {
    async function load() {
      const authPromise =
        hasSupabase()
          ? createBrowserSupabase().auth.getUser()
          : Promise.resolve({ data: { user: null } } as const);

      const [authResult, res] = await Promise.all([
        authPromise,
        fetch("/api/account/bookings"),
      ]);

      const userEmail = authResult.data.user?.email ?? null;
      setEmail(userEmail);

      const data = await res.json();
      const all = (data.bookings || []) as BookingRow[];
      const mine = userEmail
        ? all.filter(
            (b) => b.guestEmail.toLowerCase() === userEmail.toLowerCase(),
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
    void load();
  }, []);

  const today = todayISO();

  /** One card per guest-facing reference; rooms itemized underneath. */
  const bookingGroups = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of bookings) {
      const key = b.reference;
      const list = map.get(key) || [];
      list.push(b);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([reference, rooms]) => ({
      reference,
      primary: rooms[0]!,
      rooms,
    }));
  }, [bookings]);

  const upcomingGroups = useMemo(
    () => bookingGroups.filter((g) => isUpcoming(g.primary, today)),
    [bookingGroups, today],
  );
  const pastGroups = useMemo(
    () => bookingGroups.filter((g) => isPast(g.primary, today)),
    [bookingGroups, today],
  );

  function openManage(b: BookingRow) {
    setManageBooking(b);
    setEditIn(b.checkIn);
    setEditOut(b.checkOut);
    setEditGuests(b.guestCount || 1);
    setEditError(null);
    setManageOpen(true);
  }

  function openRefund(b: BookingRow) {
    setRefundBooking(b);
    setReason("");
    setNotes("");
    setRefundOpen(true);
  }

  async function saveManage() {
    if (!manageBooking) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/bookings/update-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: manageBooking.id,
          checkIn: editIn,
          checkOut: editOut,
          guests: editGuests,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update booking");

      setBookings((prev) =>
        prev.map((b) =>
          b.id === manageBooking.id
            ? {
                ...b,
                checkIn: editIn,
                checkOut: editOut,
                guestCount: editGuests,
                ...(typeof data.subtotalPkr === "number"
                  ? { totalPkr: data.subtotalPkr }
                  : {}),
              }
            : b,
        ),
      );
      setManageOpen(false);
      setMessage("Booking updated.");
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not update booking");
    } finally {
      setEditSaving(false);
    }
  }

  function submitRefund() {
    if (!refundBooking || !reason.trim()) return;
    const ticket: RefundTicket = {
      id: `rf_${Date.now()}`,
      bookingId: refundBooking.id,
      amountPkr: refundBooking.amountPaidPkr,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const next = [ticket, ...refunds];
    setRefunds(next);
    localStorage.setItem("guestay_refunds_v1", JSON.stringify(next));
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

  const fieldClass =
    "mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-ink outline-none focus:border-olive/40";

  return (
    <div className="flex justify-center bg-paper px-4 pb-20 pt-24 md:pt-28">
      <div className="w-full max-w-3xl">
        <h1 className="font-display text-3xl font-semibold text-ink">
          My Account
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {email ||
            "Browsing as guest — sign in to sync bookings across devices."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["bookings", "My Bookings"],
              ["payments", "Payments"],
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
          <>
            {bookings.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No bookings yet"
                body="Once you book a room, it'll show up here."
                ctaHref="/rooms"
                ctaLabel="Browse Rooms"
              />
            ) : (
              <div className="mt-8 space-y-8">
                {upcomingGroups.length > 0 && (
                  <section>
                    <h2 className="font-display text-lg text-ink">Upcoming</h2>
                    <ul className="mt-3 space-y-3">
                      {upcomingGroups.map((g) => (
                        <BookingCard
                          key={g.reference}
                          booking={g.primary}
                          siblings={g.rooms}
                          upcoming
                          refunds={refunds}
                          onManage={() => openManage(g.primary)}
                          onRefund={() => openRefund(g.primary)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
                {pastGroups.length > 0 && (
                  <section>
                    <h2 className="font-display text-lg text-ink">Past</h2>
                    <ul className="mt-3 space-y-3">
                      {pastGroups.map((g) => (
                        <BookingCard
                          key={g.reference}
                          booking={g.primary}
                          siblings={g.rooms}
                          upcoming={false}
                          refunds={refunds}
                          onManage={() => openManage(g.primary)}
                          onRefund={() => openRefund(g.primary)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {tab === "payments" && (
          <>
            {bookings.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                body="Payments for your stays will appear here after you book."
                ctaHref="/rooms"
                ctaLabel="Browse Rooms"
              />
            ) : (
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
          </>
        )}

        {(tab === "settings" || settingsVisited) && (
          <div className={tab === "settings" ? "block" : "hidden"}>
            <AccountSettings />
          </div>
        )}
      </div>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage Booking"
        labelledBy="manage-title"
      >
        <p className="text-sm text-ink-muted">
          {manageBooking?.roomName} · {manageBooking?.reference}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-ink-muted">Check-in</span>
            <input
              type="date"
              value={editIn}
              onChange={(e) => setEditIn(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Check-out</span>
            <input
              type="date"
              value={editOut}
              onChange={(e) => setEditOut(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="text-ink-muted">Guests</span>
          <input
            type="number"
            min={1}
            max={20}
            value={editGuests}
            onChange={(e) => setEditGuests(Number(e.target.value) || 1)}
            className={fieldClass}
          />
        </label>
        {editError && (
          <p className="mt-3 text-sm text-destructive">{editError}</p>
        )}
        <button
          type="button"
          onClick={saveManage}
          disabled={editSaving}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
        >
          {editSaving ? "Saving…" : "Save changes"}
        </button>
      </Modal>

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
    <Suspense
      fallback={
        <div className="flex justify-center bg-paper px-4 pb-20 pt-24 md:pt-28">
          <p className="text-ink-muted">Loading…</p>
        </div>
      }
    >
      <AccountInner />
    </Suspense>
  );
}
