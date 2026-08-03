"use client";

import { AccountSettings } from "@/components/account/AccountSettings";
import { Modal } from "@/components/ui/Modal";
import { createBrowserSupabase, hasSupabase } from "@/lib/supabase/client";
import { formatCurrency, formatDateLabel } from "@/lib/utils";
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
  paidAt?: string;
  createdAt?: string;
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
  const matches = tickets
    .filter((t) => t.bookingId === b.id)
    .sort(
      (a, b2) =>
        new Date(b2.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  return matches[0];
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

function refundStatusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return "Refund Requested";
  if (s === "approved_processing" || s === "refunded") return "Refund Approved";
  if (s === "denied") return "Refund Denied";
  return `Refund ${status.replace(/_/g, " ")}`;
}

function refundBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return "border-amber-500/30 bg-amber-50 text-amber-900";
  if (s === "approved_processing" || s === "refunded")
    return "border-emerald-600/25 bg-emerald-50 text-emerald-900";
  if (s === "denied") return "border-red-500/25 bg-red-50 text-red-900";
  return "border-olive/20 bg-cream-100 text-ink-muted";
}

function RefundStatusBadge({ ticket }: { ticket: RefundTicket }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = refundStatusLabel(ticket.status);
  const detail =
    ticket.ownerNote?.trim() ||
    (ticket.status.toLowerCase() === "pending"
      ? ticket.reason
      : ticket.reason) ||
    "No additional note.";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative mt-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${refundBadgeClass(ticket.status)}`}
        aria-expanded={open}
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-64 rounded-soft border border-olive/10 bg-white p-3 shadow-lift">
          <p className="text-xs font-medium text-ink">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{detail}</p>
          {ticket.ownerNote?.trim() && ticket.reason && (
            <p className="mt-2 border-t border-olive/10 pt-2 text-[11px] text-ink-muted">
              Your reason: {ticket.reason}
            </p>
          )}
        </div>
      )}
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
  const hasMenu = showManage || showRefund;

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
  const ticket = ticketForBooking(booking, refunds);
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
          {ticket && <RefundStatusBadge ticket={ticket} />}
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
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSaving, setRefundSaving] = useState(false);
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

      const authResult = await authPromise;
      const userEmail = authResult.data.user?.email ?? null;
      setEmail(userEmail);

      const headers: HeadersInit = {};
      if (hasSupabase()) {
        const {
          data: { session },
        } = await createBrowserSupabase().auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch("/api/account/bookings", { headers });
      const data = await res.json();
      const all = (data.bookings || []) as BookingRow[];
      setBookings(all);

      if (headers.Authorization) {
        try {
          const rr = await fetch("/api/refunds/request", { headers });
          if (rr.ok) {
            const body = (await rr.json()) as { tickets?: RefundTicket[] };
            setRefunds(body.tickets || []);
          } else {
            setRefunds([]);
          }
        } catch {
          setRefunds([]);
        }
      } else {
        setRefunds([]);
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

  async function submitRefund() {
    if (!refundBooking || !reason.trim()) return;
    setRefundError(null);
    setRefundSaving(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (hasSupabase()) {
        const {
          data: { session },
        } = await createBrowserSupabase().auth.getSession();
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
      }
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          bookingId: refundBooking.id,
          amountPkr: refundBooking.amountPaidPkr,
          reason,
          notes,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        ticket?: RefundTicket;
      };
      if (!res.ok || !body.ticket) {
        setRefundError(body.error || "Could not submit refund request");
        return;
      }
      setRefunds((prev) => [body.ticket!, ...prev.filter((t) => t.id !== body.ticket!.id)]);
      setRefundOpen(false);
      setReason("");
      setNotes("");
      setMessage("Refund request submitted — Pending Review");
    } catch (e) {
      setRefundError(
        e instanceof Error ? e.message : "Could not submit refund request",
      );
    } finally {
      setRefundSaving(false);
    }
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
            {(() => {
              const paid = bookings.filter((b) => b.amountPaidPkr > 0);
              if (paid.length === 0) {
                return (
                  <EmptyState
                    icon={CreditCard}
                    title="No payments yet"
                    body="Payments for your stays will appear here after you book."
                    ctaHref="/rooms"
                    ctaLabel="Browse Rooms"
                  />
                );
              }
              return (
              <ul className="mt-8 space-y-3">
                {paid.map((b) => {
                    const paidOn =
                      b.paidAt || b.createdAt
                        ? formatDateLabel(b.paidAt || b.createdAt!)
                        : null;
                    return (
                      <li
                        key={b.id}
                        className="rounded-card border border-olive/10 bg-white/80 p-4"
                      >
                        <p className="font-medium text-ink">{b.roomName}</p>
                        <p className="mt-1 font-mono text-sm text-ink-muted">
                          Paid {formatCurrency(b.amountPaidPkr)}
                          {paidOn ? ` · ${paidOn}` : ""}
                          {b.amountDuePkr > 0
                            ? ` · Remaining ${formatCurrency(b.amountDuePkr)} (settle on arrival / with staff)`
                            : ""}
                        </p>
                        <p className="mt-1 font-mono text-xs text-ink-muted">
                          {b.reference}
                        </p>
                      </li>
                    );
                  })}
              </ul>
              );
            })()}
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
        onClose={() => {
          if (!refundSaving) {
            setRefundOpen(false);
            setRefundError(null);
          }
        }}
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
        {refundError && (
          <p className="mt-3 text-sm text-destructive">{refundError}</p>
        )}
        <button
          type="button"
          onClick={() => void submitRefund()}
          disabled={refundSaving || !reason.trim()}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-soft bg-olive text-sm font-medium text-cream-50 disabled:opacity-50"
        >
          {refundSaving ? "Submitting…" : "Submit request"}
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
