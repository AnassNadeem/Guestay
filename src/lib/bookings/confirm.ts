import {
  attachPaidAt,
  getLocalBooking,
  listBookingsByOrderId,
  listLocalBookings,
  updateLocalBooking,
  upsertPaymentForBooking,
  type LocalBooking,
} from "@/lib/bookings/local-store";
import {
  generateBookingReference,
  isFinalBookingReference,
} from "@/lib/bookings/reference";
import {
  createSetPasswordToken,
  setPasswordLink,
} from "@/lib/auth/set-password-token";
import {
  sendAccountSetupEmail,
  sendBookingConfirmationEmail,
  sendInternalBookingNotification,
  type AccountLinkScenario,
} from "@/lib/mail/booking";
import type { User } from "@supabase/supabase-js";

export type { AccountLinkScenario };

export type FinalizeResult = {
  reference: string;
  scenario: AccountLinkScenario;
  bookings: LocalBooking[];
  alreadyFinalized: boolean;
};

/** Bookings that share an order (multi-room), or just the one booking. */
export async function getOrderBookings(
  booking: LocalBooking,
): Promise<LocalBooking[]> {
  if (booking.orderId) {
    const siblings = await listBookingsByOrderId(booking.orderId);
    if (siblings.length > 0) return siblings;
  }
  return [booking];
}

export async function getBookingsByReference(
  reference: string,
): Promise<LocalBooking[]> {
  const all = await listLocalBookings();
  const matched = all.filter(
    (b) => b.reference === reference || b.orderReference === reference,
  );
  return attachPaidAt(matched);
}

export function isClaimedAccount(user: User): boolean {
  if (user.user_metadata?.guestay_unclaimed === true) return false;
  if (user.last_sign_in_at) return true;
  const identities = user.identities ?? [];
  if (identities.some((i) => i.provider !== "email")) return true;
  if (user.email_confirmed_at) return true;
  return false;
}

async function resolveAccountLink(opts: {
  guestEmail: string;
  guestName: string;
  sessionUserId?: string | null;
}): Promise<{
  scenario: AccountLinkScenario;
  guestId: string | null;
  setPasswordUrl: string | null;
}> {
  const email = opts.guestEmail.trim().toLowerCase();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const { hasSupabase, createServiceSupabase } = await import(
      "@/lib/supabase/client"
    );
    if (!hasSupabase()) {
      return {
        scenario: opts.sessionUserId ? "logged_in" : "new_or_unclaimed",
        guestId: opts.sessionUserId || null,
        setPasswordUrl: null,
      };
    }

    const sb = createServiceSupabase();

    if (opts.sessionUserId) {
      const { data: sessionUserData } = await sb.auth.admin.getUserById(
        opts.sessionUserId,
      );
      const sessionUser = sessionUserData?.user;
      if (sessionUser) {
        return {
          scenario: "logged_in",
          guestId: sessionUser.id,
          setPasswordUrl: null,
        };
      }
    }

    const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const existing = listed?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (existing && isClaimedAccount(existing)) {
      return {
        scenario: "existing_claimed",
        guestId: existing.id,
        setPasswordUrl: null,
      };
    }

    const pwToken = createSetPasswordToken();
    let guestId = existing?.id ?? null;

    if (!existing) {
      const { data: created, error } = await sb.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          full_name: opts.guestName,
          display_name: opts.guestName,
          guestay_unclaimed: true,
          guestay_set_password_hash: pwToken.hash,
          guestay_set_password_expires: pwToken.expiresAt,
        },
      });
      if (error) {
        console.error("[account link] createUser failed", error);
      } else {
        guestId = created.user?.id ?? null;
      }
    } else {
      await sb.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          ...existing.user_metadata,
          guestay_unclaimed: true,
          full_name: existing.user_metadata?.full_name || opts.guestName,
          display_name:
            existing.user_metadata?.display_name || opts.guestName,
          guestay_set_password_hash: pwToken.hash,
          guestay_set_password_expires: pwToken.expiresAt,
        },
      });
      guestId = existing.id;
    }

    const setPasswordUrl = guestId
      ? setPasswordLink({
          siteUrl: site,
          email,
          token: pwToken.token,
        })
      : null;

    return {
      scenario: "new_or_unclaimed",
      guestId,
      setPasswordUrl,
    };
  } catch (err) {
    console.error("[account link] unexpected failure", err);
    return {
      scenario: opts.sessionUserId ? "logged_in" : "new_or_unclaimed",
      guestId: opts.sessionUserId || null,
      setPasswordUrl: null,
    };
  }
}

function sumPaid(bookings: LocalBooking[]) {
  return bookings.reduce((s, b) => s + b.amountPaidPkr, 0);
}

function sumDue(bookings: LocalBooking[]) {
  return bookings.reduce((s, b) => s + b.amountDuePkr, 0);
}

/**
 * Mint guest-facing reference, link account, send confirmation + internal mail.
 * Writes to Supabase as source of truth. Idempotent on GST + terminal status.
 */
export async function finalizeSuccessfulBooking(opts: {
  bookingId: string;
  status: "paid" | "partially_paid" | "confirmed_no_advance";
  amounts?: Array<{ id: string; amountPaidPkr: number; amountDuePkr: number }>;
  sessionUserId?: string | null;
  /** Safepay webhook notification_id — stamped onto payments for replay protection. */
  notificationId?: string | null;
}): Promise<FinalizeResult | null> {
  const seed = await getLocalBooking(opts.bookingId);
  if (!seed) return null;

  const siblings = await getOrderBookings(seed);

  // Fully done (status + mail) — safe no-op for webhook retries.
  if (
    siblings.every(
      (b) =>
        isFinalBookingReference(b.reference) &&
        ["paid", "partially_paid", "confirmed_no_advance"].includes(b.status),
    ) &&
    siblings.some((b) => b.confirmationNotifiedAt)
  ) {
    return {
      reference: siblings[0]!.reference,
      scenario: siblings[0]!.accountLinkScenario || "logged_in",
      bookings: siblings,
      alreadyFinalized: true,
    };
  }

  const reference =
    siblings.find((b) => isFinalBookingReference(b.reference))?.reference ||
    generateBookingReference();

  for (const b of siblings) {
    const override = opts.amounts?.find((a) => a.id === b.id);
    let amountPaidPkr = b.amountPaidPkr;
    let amountDuePkr = b.amountDuePkr;

    if (override) {
      amountPaidPkr = override.amountPaidPkr;
      amountDuePkr = override.amountDuePkr;
    } else if (opts.status === "confirmed_no_advance") {
      amountPaidPkr = 0;
      amountDuePkr = b.subtotalPkr;
    } else if (opts.status === "partially_paid") {
      amountPaidPkr = Math.ceil(b.subtotalPkr / 2);
      amountDuePkr = Math.max(0, b.subtotalPkr - amountPaidPkr);
    } else if (opts.status === "paid") {
      amountPaidPkr = b.subtotalPkr;
      amountDuePkr = 0;
    }

    await updateLocalBooking(b.id, {
      reference,
      orderReference: reference,
      status: opts.status,
      amountPaidPkr,
      amountDuePkr,
      holdExpiresAt: null,
      paymentKind:
        opts.status === "confirmed_no_advance"
          ? "none"
          : opts.status === "partially_paid"
            ? "half"
            : b.paymentKind || "full",
    });

    if (
      amountPaidPkr > 0 &&
      b.gatewayTracker &&
      opts.status !== "confirmed_no_advance"
    ) {
      await upsertPaymentForBooking({
        bookingId: b.id,
        orderId: b.orderId,
        amountPkr: amountPaidPkr,
        tracker: b.gatewayTracker,
        kind: opts.status === "partially_paid" ? "deposit" : "full",
        status: "succeeded",
        paidAt: new Date().toISOString(),
        notificationId: opts.notificationId,
      });
    }
  }

  const guest = siblings[0]!;
  const link = await resolveAccountLink({
    guestEmail: guest.guestEmail,
    guestName: guest.guestName,
    sessionUserId: opts.sessionUserId,
  });

  const notifiedAt = new Date().toISOString();
  const updated: LocalBooking[] = [];
  for (const b of siblings) {
    const next = await updateLocalBooking(b.id, {
      guestId: link.guestId || undefined,
      accountLinkScenario: link.scenario,
      confirmationNotifiedAt: notifiedAt,
    });
    if (next) updated.push(next);
  }

  const withPaid = await attachPaidAt(updated);
  const paidAt =
    withPaid.map((b) => b.paidAt).find(Boolean) ||
    (sumPaid(withPaid) > 0 ? notifiedAt : undefined);

  const rooms = withPaid.map((b) => ({
    roomName: b.roomName,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guestCount,
    bookingMode: b.bookingMode,
  }));

  void sendBookingConfirmationEmail({
    to: guest.guestEmail,
    guestName: guest.guestName,
    reference,
    rooms,
    amountPaidPkr: sumPaid(withPaid),
    amountDuePkr: sumDue(withPaid),
    status: opts.status,
    scenario: link.scenario,
    paidAt,
  }).then((r) => {
    if (!r.ok) {
      console.error("[finalize] confirmation email failed", r.error, {
        reference,
      });
    }
  });

  if (link.scenario === "new_or_unclaimed" && link.setPasswordUrl) {
    void sendAccountSetupEmail({
      to: guest.guestEmail,
      guestName: guest.guestName,
      setPasswordUrl: link.setPasswordUrl,
    }).then((r) => {
      if (!r.ok) {
        console.error("[finalize] account setup email failed", r.error, {
          reference,
        });
      }
    });
  }

  void sendInternalBookingNotification({
    reference,
    guestName: guest.guestName,
    guestEmail: guest.guestEmail,
    guestPhone: guest.guestPhone,
    rooms,
    amountPaidPkr: sumPaid(withPaid),
    amountDuePkr: sumDue(withPaid),
    status: opts.status,
    paidAt,
  }).then((r) => {
    if (!r.ok) {
      console.error("[finalize] internal notify failed", r.error, {
        reference,
      });
    }
  });

  // In-app admin notification (bell / Notifications page)
  try {
    const { createServiceSupabase, hasSupabase } = await import(
      "@/lib/supabase/client"
    );
    if (hasSupabase()) {
      const sb = createServiceSupabase();
      await sb.from("notifications").insert({
        kind: "new_booking",
        title: "New booking confirmed",
        body: `${guest.guestName} · ${reference} · ${opts.status.replace(/_/g, " ")}`,
        href: "/bookings",
        meta: { reference, bookingId: opts.bookingId, status: opts.status },
      });
    }
  } catch (e) {
    console.warn("[finalize] in-app notification skipped", e);
  }

  return {
    reference,
    scenario: link.scenario,
    bookings: withPaid,
    alreadyFinalized: false,
  };
}

export async function sessionUserIdFromRequest(
  req: Request,
): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const { hasSupabase, createServiceSupabase } = await import(
      "@/lib/supabase/client"
    );
    if (!hasSupabase()) return null;
    const sb = createServiceSupabase();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
