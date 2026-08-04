import type { BaseRecord, DataProvider } from "@refinedev/core";
import { SITE_URL } from "../lib/format";
import { supabase } from "../supabase";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured for the admin app");
  }
  return supabase;
}

/** Map UI aliases to DB room_category enum. */
function normalizeRoomCategory(raw: unknown): string {
  const v = String(raw || "shared_bedroom");
  if (v === "entire_place" || v === "entire_home") return "flat";
  if (v === "shared_bedroom" || v === "private_room" || v === "flat") return v;
  return "shared_bedroom";
}

function summarizeAuditDetail(
  before: unknown,
  after: unknown,
  action: string,
): string {
  const b = (before || {}) as Record<string, unknown>;
  const a = (after || {}) as Record<string, unknown>;
  const keys = [
    "status",
    "amount_paid_pkr",
    "amount_due_pkr",
    "check_in",
    "check_out",
    "guest_name",
    "reference",
    "owner_note",
  ];
  const parts: string[] = [];
  if (action.startsWith("refund_")) {
    if (a.status) parts.push(`status → ${String(a.status)}`);
    if (a.owner_note) parts.push(`note: ${String(a.owner_note)}`);
  }
  for (const k of keys) {
    if (b[k] !== undefined && a[k] !== undefined && b[k] !== a[k]) {
      parts.push(`${k}: ${String(b[k])} → ${String(a[k])}`);
    } else if (b[k] === undefined && a[k] !== undefined && action === "insert") {
      if (["status", "reference", "guest_name"].includes(k)) {
        parts.push(`${k}: ${String(a[k])}`);
      }
    }
  }
  if (parts.length) return parts.slice(0, 4).join("; ");
  if (action === "delete") return "Row deleted";
  if (action === "insert") return "Row created";
  return action.replace(/_/g, " ");
}

type RoomRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  capacity: number;
  beds: number;
  status: string;
  amenities: string[] | null;
  cover_image_path: string | null;
  room_images?: Array<{ id: string; storage_path: string; sort_order: number }> | null;
  room_pricing?: Array<{
    booking_mode: string;
    tier1_rate_pkr: number;
    tier2_rate_pkr: number;
    tier3_rate_pkr: number;
    tier4_rate_pkr: number;
    breakpoint_t2: number;
    breakpoint_t3: number;
    breakpoint_t4: number;
  }>;
};

function mapRoom(row: RoomRow) {
  const exclusive =
    row.room_pricing?.find((p) => p.booking_mode === "exclusive") ||
    row.room_pricing?.[0];
  const gallery = [...(row.room_images || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const cover = row.cover_image_path;
  const photos =
    gallery.length > 0
      ? gallery.map((img, i) => ({
          id: img.id,
          name: `Photo ${i + 1}`,
          thumbnail: cover ? img.storage_path === cover : i === 0,
          url: img.storage_path,
        }))
      : cover
        ? [{ id: "cover", name: "Cover", thumbnail: true, url: cover }]
        : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.category,
    status: row.status,
    description: row.description || "",
    capacity: row.capacity,
    beds: row.beds,
    amenities: row.amenities || [],
    tier1: exclusive?.tier1_rate_pkr ?? 0,
    tier2: exclusive?.tier2_rate_pkr ?? 0,
    tier3: exclusive?.tier3_rate_pkr ?? 0,
    tier4: exclusive?.tier4_rate_pkr ?? 0,
    breakpoint1: 1,
    breakpoint2: exclusive?.breakpoint_t2 ?? 7,
    breakpoint3: exclusive?.breakpoint_t3 ?? 15,
    breakpoint4: exclusive?.breakpoint_t4 ?? 30,
    photos,
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function syncRoomImages(
  roomId: string,
  photos: Array<{ url?: string; thumbnail?: boolean }>,
) {
  const sb = requireClient();
  const urls = photos.map((p) => p.url).filter(Boolean) as string[];
  await sb.from("room_images").delete().eq("room_id", roomId);
  if (urls.length === 0) return;
  await sb.from("room_images").insert(
    urls.map((storage_path, sort_order) => ({
      room_id: roomId,
      storage_path,
      sort_order,
    })),
  );
}

function mapBooking(row: Record<string, unknown>) {
  const rooms = row.rooms as { name?: string; slug?: string } | null;
  const payments = (row.payments as Array<{
    paid_at?: string | null;
    created_at?: string;
    status?: string;
    amount_pkr?: number;
  }> | null) || [];
  const succeeded = payments.filter((p) => p.status === "succeeded");
  const latestPay = succeeded.sort((a, b) => {
    const ta = new Date(a.paid_at || a.created_at || 0).getTime();
    const tb = new Date(b.paid_at || b.created_at || 0).getTime();
    return tb - ta;
  })[0];
  const amountPaid = Number(row.amount_paid_pkr || 0);
  const amountDue = Number(row.amount_due_pkr || 0);
  const status = String(row.status || "");
  let paymentStatus = "unpaid";
  if (status === "refunded") paymentStatus = "refunded";
  else if (amountPaid > 0 && amountDue > 0) paymentStatus = "partially_paid";
  else if (amountPaid > 0 && amountDue <= 0) paymentStatus = "paid";
  else if (status === "paid") paymentStatus = "paid";
  else if (status === "partially_paid") paymentStatus = "partially_paid";

  const paidAt =
    latestPay?.paid_at ||
    latestPay?.created_at ||
    (amountPaid > 0 ? (row.created_at as string) : undefined);

  const roomName = rooms?.name || "Room";
  const guestName = String(row.guest_name || "");

  return {
    id: row.id,
    reference: row.reference,
    roomId: row.room_id,
    roomName,
    room: roomName,
    guestName,
    guest: guestName,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    guests: row.guest_count,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: row.nights,
    status,
    source: row.source,
    amountPaidPkr: amountPaid,
    amountDuePkr: amountDue,
    totalPkr: row.total_pkr,
    paymentStatus,
    paidAt,
    createdAt: row.created_at,
  };
}

export const dataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
  }: {
    resource: string;
  }) => {
    const sb = requireClient();

    if (resource === "rooms") {
      const { data, error } = await sb
        .from("rooms")
        .select(
          "id, slug, name, category, description, capacity, beds, status, amenities, cover_image_path, room_pricing(*), room_images(id, storage_path, sort_order)",
        )
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((r) => mapRoom(r as RoomRow));
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "bookings") {
      const { data, error } = await sb
        .from("bookings")
        .select(
          "id, reference, room_id, guest_name, guest_email, guest_phone, guest_count, check_in, check_out, nights, status, source, amount_paid_pkr, amount_due_pkr, total_pkr, created_at, rooms(name, slug), payments(paid_at, created_at, status, amount_pkr)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((r) =>
        mapBooking(r as Record<string, unknown>),
      );
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "refunds") {
      const { data, error } = await sb
        .from("refund_requests")
        .select(
          "id, booking_id, guest_id, amount_pkr, reason, status, owner_note, created_at, bookings(guest_name, reference)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((t) => {
        const booking = t.bookings as
          | { guest_name?: string; reference?: string }
          | { guest_name?: string; reference?: string }[]
          | null;
        const b = Array.isArray(booking) ? booking[0] : booking;
        return {
          id: t.id,
          bookingId: t.booking_id,
          guest: b?.guest_name || "Guest",
          guestId: t.guest_id,
          reference: b?.reference,
          amountPkr: t.amount_pkr,
          reason: t.reason,
          status: t.status,
          ownerNote: t.owner_note,
          createdAt: t.created_at,
        };
      });
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "guests" || resource === "profiles") {
      const { data, error } = await sb
        .from("profiles")
        .select("id, email, full_name, phone, role, created_at")
        .eq("role", "guest")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((p) => ({
        id: p.id,
        email: p.email,
        name: p.full_name || p.email,
        phone: p.phone,
        role: p.role,
        createdAt: p.created_at,
        joinedAt: p.created_at ? String(p.created_at).slice(0, 10) : undefined,
      }));
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "users") {
      const { data, error } = await sb
        .from("profiles")
        .select(
          "id, email, full_name, phone, role, created_at, last_login_at, is_suspended",
        )
        .in("role", ["owner", "manager"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((p) => ({
        id: p.id,
        email: p.email,
        name: p.full_name || p.email,
        role: p.role,
        status: p.is_suspended ? "inactive" : "active",
        lastLogin: p.last_login_at
          ? new Date(p.last_login_at as string).toLocaleString()
          : "—",
        createdAt: p.created_at,
      }));
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "notifications") {
      const { data, error } = await sb
        .from("notifications")
        .select("id, kind, title, body, href, meta, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const mapped = (data || []).map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        message: n.body,
        body: n.body,
        href: n.href,
        meta: n.meta,
        unread: !n.is_read,
        isRead: n.is_read,
        at: n.created_at,
        createdAt: n.created_at,
      }));
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "ota") {
      const { data, error } = await sb
        .from("ota_feeds")
        .select("id, room_id, provider, ical_url, last_synced_at, last_sync_status, last_error, active, rooms(name, slug)")
        .eq("active", true)
        .order("last_synced_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const mapped = (data || []).map((f) => {
        const room = f.rooms as
          | { name?: string; slug?: string }
          | { name?: string; slug?: string }[]
          | null;
        const r = Array.isArray(room) ? room[0] : room;
        const status =
          f.last_sync_status === "ok" || f.last_sync_status === "success"
            ? "ok"
            : f.last_sync_status || "never";
        return {
          id: f.id,
          room: r?.name || "Room",
          roomSlug: r?.slug || "",
          provider: f.provider,
          lastSyncedAt: f.last_synced_at || "",
          status,
          lastError: f.last_error,
        };
      });
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    if (resource === "audit_log") {
      const { data, error } = await sb
        .from("audit_log")
        .select(
          "id, actor_id, actor_email, action, table_name, row_id, before, after, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const mapped = (data || []).map((e) => ({
        id: String(e.id),
        actor: e.actor_email || e.actor_id || "system",
        action: e.action,
        entity: e.row_id ? `${e.table_name} · ${e.row_id}` : e.table_name,
        tableName: e.table_name,
        rowId: e.row_id,
        before: e.before,
        after: e.after,
        detail: summarizeAuditDetail(e.before, e.after, e.action),
        at: e.created_at,
      }));
      return { data: mapped as unknown as TData[], total: mapped.length };
    }

    // Soft empty for unused resources (e.g. calendar stubs)
    return { data: [] as TData[], total: 0 };
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: {
    resource: string;
    id: string | number;
  }) => {
    const sb = requireClient();
    if (resource === "rooms") {
      const { data, error } = await sb
        .from("rooms")
        .select(
          "id, slug, name, category, description, capacity, beds, status, amenities, cover_image_path, room_pricing(*), room_images(id, storage_path, sort_order)",
        )
        .eq("id", String(id))
        .single();
      if (error || !data) throw new Error(error?.message || "Not found");
      return { data: mapRoom(data as RoomRow) as unknown as TData };
    }
    const { data, error } = await sb
      .from(resource)
      .select("*")
      .eq("id", String(id))
      .single();
    if (error || !data) throw new Error(error?.message || "Not found");
    return { data: data as TData };
  },

  create: async <TData extends BaseRecord = BaseRecord>({
    resource,
    variables,
  }: {
    resource: string;
    variables: object;
  }) => {
    const sb = requireClient();
    const v = variables as Record<string, unknown>;

    if (resource === "rooms") {
      const name = String(v.name || "New room");
      const slug = slugify(name) || `room-${Date.now()}`;
      const category = normalizeRoomCategory(v.type);
      const { data: room, error } = await sb
        .from("rooms")
        .insert({
          slug,
          name,
          category,
          description: String(v.description || ""),
          long_description: String(v.description || ""),
          capacity: Number(v.capacity) || 1,
          beds: Number(v.beds) || 1,
          bedrooms: 1,
          bathrooms: 0,
          allows_shared_booking: category === "shared_bedroom",
          allows_exclusive_booking: true,
          status: "active",
          amenities: (v.amenities as string[]) || [],
          house_rules: [],
          featured: false,
          sort_order: 99,
          cover_image_path:
            (v.photos as Array<{ url?: string }>)?.[0]?.url || null,
        })
        .select("id")
        .single();
      if (error || !room) throw new Error(error?.message || "Create failed");

      const { error: pricingErr } = await sb.from("room_pricing").insert({
        room_id: room.id,
        booking_mode: "exclusive",
        tier1_rate_pkr: Number(v.tier1) || 0,
        tier2_rate_pkr: Number(v.tier2) || 0,
        tier3_rate_pkr: Number(v.tier3) || 0,
        tier4_rate_pkr: Number(v.tier4) || 0,
        breakpoint_t2: Number(v.breakpoint2) || 7,
        breakpoint_t3: Number(v.breakpoint3) || 15,
        breakpoint_t4: Number(v.breakpoint4) || 30,
        security_deposit_pkr: 10000,
      });
      if (pricingErr) throw new Error(pricingErr.message);

      // Also seed shared pricing when the room allows shared booking
      if (category === "shared_bedroom") {
        const { error: sharedErr } = await sb.from("room_pricing").insert({
          room_id: room.id,
          booking_mode: "shared",
          tier1_rate_pkr: Number(v.tier1) || 0,
          tier2_rate_pkr: Number(v.tier2) || 0,
          tier3_rate_pkr: Number(v.tier3) || 0,
          tier4_rate_pkr: Number(v.tier4) || 0,
          breakpoint_t2: Number(v.breakpoint2) || 7,
          breakpoint_t3: Number(v.breakpoint3) || 15,
          breakpoint_t4: Number(v.breakpoint4) || 30,
          security_deposit_pkr: 10000,
        });
        if (sharedErr) throw new Error(sharedErr.message);
      }

      if (v.photos) {
        await syncRoomImages(
          room.id as string,
          v.photos as Array<{ url?: string; thumbnail?: boolean }>,
        );
      }

      const one = await dataProvider.getOne({ resource: "rooms", id: room.id });
      return { data: one.data as TData };
    }

    if (resource === "bookings") {
      // Walk-in / manual add via Next API preferred; minimal insert here
      throw new Error("Create bookings via Walk-in or the guest checkout flow");
    }

    if (resource === "users") {
      throw new Error(
        "Staff invites are link-only for now — share the magic link shown in the dialog",
      );
    }

    const { data, error } = await sb
      .from(resource)
      .insert(v)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "Create failed");
    return { data: data as TData };
  },

  update: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
    variables,
  }: {
    resource: string;
    id: string | number;
    variables: object;
  }) => {
    const sb = requireClient();
    const v = variables as Record<string, unknown>;

    if (resource === "rooms") {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (v.name !== undefined) patch.name = v.name;
      if (v.description !== undefined) {
        patch.description = v.description;
        patch.long_description = v.description;
      }
      if (v.type !== undefined) patch.category = normalizeRoomCategory(v.type);
      if (v.capacity !== undefined) patch.capacity = v.capacity;
      if (v.beds !== undefined) patch.beds = v.beds;
      if (v.amenities !== undefined) patch.amenities = v.amenities;
      if (v.status !== undefined) patch.status = v.status;
      if (v.photos !== undefined) {
        const photos = v.photos as Array<{ url?: string; thumbnail?: boolean }>;
        const cover =
          photos.find((p) => p.thumbnail)?.url || photos[0]?.url || null;
        patch.cover_image_path = cover;
        await syncRoomImages(String(id), photos);
      }

      const { error } = await sb
        .from("rooms")
        .update(patch)
        .eq("id", String(id));
      if (error) throw error;

      if (
        v.tier1 !== undefined ||
        v.tier2 !== undefined ||
        v.tier3 !== undefined ||
        v.tier4 !== undefined
      ) {
        const { data: existing } = await sb
          .from("room_pricing")
          .select("id")
          .eq("room_id", String(id))
          .eq("booking_mode", "exclusive")
          .maybeSingle();

        const pricingPatch = {
          tier1_rate_pkr: Number(v.tier1) || 0,
          tier2_rate_pkr: Number(v.tier2) || 0,
          tier3_rate_pkr: Number(v.tier3) || 0,
          tier4_rate_pkr: Number(v.tier4) || 0,
          breakpoint_t2: Number(v.breakpoint2) || 7,
          breakpoint_t3: Number(v.breakpoint3) || 15,
          breakpoint_t4: Number(v.breakpoint4) || 30,
        };

        if (existing?.id) {
          await sb
            .from("room_pricing")
            .update(pricingPatch)
            .eq("id", existing.id);
        } else {
          await sb.from("room_pricing").insert({
            room_id: String(id),
            booking_mode: "exclusive",
            ...pricingPatch,
            security_deposit_pkr: 10000,
          });
        }
      }

      const one = await dataProvider.getOne({ resource: "rooms", id });
      return { data: one.data as TData };
    }

    if (resource === "refunds") {
      const patch: Record<string, unknown> = {};
      if (v.status !== undefined) patch.status = v.status;
      if (v.ownerNote !== undefined) patch.owner_note = v.ownerNote;
      if (Object.keys(patch).length === 0) {
        // comments are client-only; ignore silently
        const one = await sb
          .from("refund_requests")
          .select("*")
          .eq("id", String(id))
          .maybeSingle();
        return {
          data: {
            id,
            status: one.data?.status,
            ownerNote: one.data?.owner_note,
            ...(v as object),
          } as unknown as TData,
        };
      }
      const { data, error } = await sb
        .from("refund_requests")
        .update(patch)
        .eq("id", String(id))
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message || "Update failed");
      return {
        data: {
          id: data.id,
          bookingId: data.booking_id,
          amountPkr: data.amount_pkr,
          reason: data.reason,
          status: data.status,
          ownerNote: data.owner_note,
          createdAt: data.created_at,
        } as unknown as TData,
      };
    }

    if (resource === "users") {
      const patch: Record<string, unknown> = {};
      if (v.status !== undefined) {
        patch.is_suspended =
          v.status === "suspended" || v.status === "inactive";
      }
      if (v.role !== undefined) {
        const role =
          v.role === "admin" ? "owner" : (v.role as string);
        patch.role = role;
      }
      const { data, error } = await sb
        .from("profiles")
        .update(patch)
        .eq("id", String(id))
        .select("id, email, role, is_suspended, last_login_at")
        .single();
      if (error || !data) throw new Error(error?.message || "Update failed");
      return {
        data: {
          id: data.id,
          email: data.email,
          role: data.role,
          status: data.is_suspended ? "inactive" : "active",
          lastLogin: data.last_login_at
            ? new Date(data.last_login_at as string).toLocaleString()
            : "—",
        } as unknown as TData,
      };
    }

    if (resource === "notifications") {
      const patch: Record<string, unknown> = {};
      if (v.isRead !== undefined) patch.is_read = v.isRead;
      if (v.unread !== undefined) patch.is_read = !v.unread;
      if (v.is_read !== undefined) patch.is_read = v.is_read;
      const { data, error } = await sb
        .from("notifications")
        .update(patch)
        .eq("id", String(id))
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message || "Update failed");
      return {
        data: {
          id: data.id,
          title: data.title,
          message: data.body,
          unread: !data.is_read,
          isRead: data.is_read,
          at: data.created_at,
        } as unknown as TData,
      };
    }

    const { data, error } = await sb
      .from(resource)
      .update(v)
      .eq("id", String(id))
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "Update failed");
    return { data: data as TData };
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: {
    resource: string;
    id: string | number;
  }) => {
    const sb = requireClient();
    if (resource === "rooms") {
      const { data, error } = await sb
        .from("rooms")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", String(id))
        .select("id")
        .single();
      if (error) throw error;
      return { data: { id: data.id } as TData };
    }
    if (resource === "notifications") {
      const { data, error } = await sb
        .from("notifications")
        .delete()
        .eq("id", String(id))
        .select("id")
        .single();
      if (error) throw error;
      return { data: { id: data.id } as TData };
    }
    const { data, error } = await sb
      .from(resource)
      .delete()
      .eq("id", String(id))
      .select("*")
      .single();
    if (error) throw error;
    return { data: data as TData };
  },

  getApiUrl: () => SITE_URL,
} as DataProvider;
