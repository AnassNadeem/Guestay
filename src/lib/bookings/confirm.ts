import {
  getLocalBooking,
  listLocalBookings,
  updateLocalBooking,
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
export function getOrderBookings(booking: LocalBooking): LocalBooking[] {
  if (booking.orderId) {
    const siblings = listLocalBookings().filter(
      (b) => b.orderId === booking.orderId,
    );
    if (siblings.length > 0) return siblings;
  }
  const orderMatch = booking.notes?.match(/order:([a-f0-9]+)/i);
  if (orderMatch) {
    const orderId = orderMatch[1];
    const siblings = listLocalBookings().filter(
      (b) =>
        b.orderId === orderId ||
        b.notes?.includes(`order:${orderId}`),
    );
    if (siblings.length > 0) return siblings;
  }
  return [booking];
}

export function getBookingsByReference(reference: string): LocalBooking[] {
  return listLocalBookings().filter(
    (b) => b.reference === reference || b.orderReference === reference,
  );
}

/**
 * Claimed = can sign in today (password set, or OAuth, or prior successful login).
 * Unclaimed = auto-created for a past booking; set-password link never completed.
 */
export function isClaimedAccount(user: User): boolean {
  if (user.user_metadata?.guestay_unclaimed === true) return false;
  if (user.last_sign_in_at) return true;
  const identities = user.identities ?? [];
  if (identities.some((i) => i.provider !== "email")) return true;
  // Confirmed email identity without our unclaimed flag → treated as claimed
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
  /** Plain set-password URL for new/unclaimed — never a magic link. */
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

    // Scenario 1: logged in at checkout — attach to session account
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

    // Scenario 3: no account OR unclaimed — create / reuse + 24h set-password token
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
 * Idempotent: if already finalized with a GST reference, returns without re-emailing.
 * Email failures never throw.
 */
export async function finalizeSuccessfulBooking(opts: {
  /** Any booking id in the order (siblings resolved automatically). */
  bookingId: string;
  status: "paid" | "partially_paid" | "confirmed_no_advance";
  /** Per-booking paid amounts; if omitted, derived from paymentKind + subtotal. */
  amounts?: Array<{ id: string; amountPaidPkr: number; amountDuePkr: number }>;
  sessionUserId?: string | null;
}): Promise<FinalizeResult | null> {
  const seed = getLocalBooking(opts.bookingId);
  if (!seed) return null;

  const siblings = getOrderBookings(seed);

  // Idempotent re-entry (return page + webhook)
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

  // Apply payment amounts
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

    updateLocalBooking(b.id, {
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
  }

  const guest = siblings[0]!;
  const link = await resolveAccountLink({
    guestEmail: guest.guestEmail,
    guestName: guest.guestName,
    sessionUserId: opts.sessionUserId,
  });

  const notifiedAt = new Date().toISOString();
  for (const b of siblings) {
    updateLocalBooking(b.id, {
      guestId: link.guestId || undefined,
      accountLinkScenario: link.scenario,
      confirmationNotifiedAt: notifiedAt,
    });
  }

  const updated = siblings.map((b) => getLocalBooking(b.id)!);
  const rooms = updated.map((b) => ({
    roomName: b.roomName,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guestCount,
    bookingMode: b.bookingMode,
  }));

  // Fire-and-forget emails — payment success is source of truth
  void sendBookingConfirmationEmail({
    to: guest.guestEmail,
    guestName: guest.guestName,
    reference,
    rooms,
    amountPaidPkr: sumPaid(updated),
    amountDuePkr: sumDue(updated),
    status: opts.status,
    scenario: link.scenario,
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
    amountPaidPkr: sumPaid(updated),
    amountDuePkr: sumDue(updated),
    status: opts.status,
  }).then((r) => {
    if (!r.ok) {
      console.error("[finalize] internal notify failed", r.error, {
        reference,
      });
    }
  });

  // Best-effort: sync final reference to Supabase if row exists
  void syncSupabaseConfirmation(updated, link.guestId).catch((err) => {
    console.error("[finalize] supabase sync failed", err);
  });

  return {
    reference,
    scenario: link.scenario,
    bookings: updated,
    alreadyFinalized: false,
  };
}

async function syncSupabaseConfirmation(
  bookings: LocalBooking[],
  guestId: string | null,
) {
  const { hasSupabase, createServiceSupabase } = await import(
    "@/lib/supabase/client"
  );
  if (!hasSupabase()) return;
  const sb = createServiceSupabase();
  for (const b of bookings) {
    await sb
      .from("bookings")
      .update({
        reference: b.reference,
        status: b.status,
        amount_paid_pkr: b.amountPaidPkr,
        amount_due_pkr: b.amountDuePkr,
        hold_expires_at: null,
        guest_id: guestId,
        guest_name: b.guestName,
        guest_email: b.guestEmail,
        guest_phone: b.guestPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id);
  }
}

/** Resolve session user from Authorization: Bearer <jwt>. */
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
