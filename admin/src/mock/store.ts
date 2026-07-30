type Row = Record<string, unknown> & { id: string };

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

const TODAY = iso(today);

const db: Record<string, Row[]> = {
  bookings: [
    {
      id: "1",
      reference: "GST-1001",
      guest: "Ayesha Khan",
      guestEmail: "ayesha@example.com",
      room: "Shared Room A",
      checkIn: TODAY,
      checkOut: iso(addDays(today, 3)),
      source: "direct",
      status: "paid",
      paymentStatus: "paid",
      totalPkr: 40000,
      createdAt: iso(addDays(today, -12)),
    },
    {
      id: "2",
      reference: "GST-1002",
      guest: "Omar Rashid",
      guestEmail: "omar@example.com",
      room: "Private Room",
      checkIn: iso(addDays(today, -5)),
      checkOut: TODAY,
      source: "airbnb",
      status: "partially_paid",
      paymentStatus: "partially_paid",
      totalPkr: 35000,
      createdAt: iso(addDays(today, -20)),
    },
    {
      id: "3",
      reference: "GST-1003",
      guest: "Sana Malik",
      guestEmail: "sana@example.com",
      room: "Private Room",
      checkIn: iso(addDays(today, 2)),
      checkOut: iso(addDays(today, 6)),
      source: "booking_com",
      status: "confirmed_no_advance",
      paymentStatus: "unpaid",
      totalPkr: 52000,
      createdAt: iso(addDays(today, -3)),
    },
    {
      id: "4",
      reference: "GST-1004",
      guest: "Bilal Ahmed",
      guestEmail: "bilal@example.com",
      room: "Shared Room A",
      checkIn: iso(addDays(today, -14)),
      checkOut: iso(addDays(today, -8)),
      source: "walk_in",
      status: "completed",
      paymentStatus: "paid",
      totalPkr: 28000,
      createdAt: iso(addDays(today, -16)),
    },
    {
      id: "5",
      reference: "GST-1005",
      guest: "Ayesha Khan",
      guestEmail: "ayesha@example.com",
      room: "Private Room",
      checkIn: iso(addDays(today, -40)),
      checkOut: iso(addDays(today, -36)),
      source: "direct",
      status: "completed",
      paymentStatus: "paid",
      totalPkr: 33000,
      createdAt: iso(addDays(today, -45)),
    },
    {
      id: "6",
      reference: "GST-1006",
      guest: "Hassan Iqbal",
      guestEmail: "hassan@example.com",
      room: "Shared Room A",
      checkIn: iso(addDays(today, -2)),
      checkOut: iso(addDays(today, 1)),
      source: "airbnb",
      status: "cancelled",
      paymentStatus: "refunded",
      totalPkr: 18000,
      createdAt: iso(addDays(today, -9)),
    },
  ],
  rooms: [
    {
      id: "r1",
      name: "Shared Room A",
      type: "shared_bedroom",
      status: "active",
      capacity: 4,
      beds: 4,
      description: "Bright shared dorm with garden view and lockers.",
      amenities: ["Wi-Fi", "AC", "Lockers", "Shared bath"],
      tier1: 5000,
      tier2: 4000,
      tier3: 3500,
      tier4: 3000,
      breakpoint1: 1,
      breakpoint2: 3,
      breakpoint3: 7,
      breakpoint4: 30,
      photos: [
        { id: "p1", name: "front.jpg", thumbnail: true },
        { id: "p2", name: "beds.jpg", thumbnail: false },
      ],
    },
    {
      id: "r2",
      name: "Private Room",
      type: "private_room",
      status: "active",
      capacity: 2,
      beds: 1,
      description: "Cozy private room with ensuite bathroom.",
      amenities: ["Wi-Fi", "AC", "Ensuite", "Desk"],
      tier1: 8000,
      tier2: 7000,
      tier3: 6500,
      tier4: 6000,
      breakpoint1: 1,
      breakpoint2: 3,
      breakpoint3: 7,
      breakpoint4: 30,
      photos: [{ id: "p3", name: "room.jpg", thumbnail: true }],
    },
  ],
  guests: [
    {
      id: "g1",
      name: "Ayesha Khan",
      email: "ayesha@example.com",
      phone: "+92 300 1234567",
      verified: true,
      joinedAt: iso(addDays(today, -120)),
    },
    {
      id: "g2",
      name: "Omar Rashid",
      email: "omar@example.com",
      phone: "+92 321 9876543",
      verified: true,
      joinedAt: iso(addDays(today, -60)),
    },
    {
      id: "g3",
      name: "Sana Malik",
      email: "sana@example.com",
      phone: "+92 333 4567890",
      verified: false,
      joinedAt: iso(addDays(today, -3)),
    },
    {
      id: "g4",
      name: "Bilal Ahmed",
      email: "bilal@example.com",
      phone: "+92 345 1112223",
      verified: false,
      joinedAt: iso(addDays(today, -16)),
    },
  ],
  refunds: [
    {
      id: "rf1",
      bookingId: "1",
      guest: "Ayesha Khan",
      amountPkr: 10000,
      reason: "Change of plans",
      status: "pending",
      comments: [],
    },
    {
      id: "rf2",
      bookingId: "6",
      guest: "Hassan Iqbal",
      amountPkr: 18000,
      reason: "Cancelled trip due to illness",
      status: "pending",
      comments: [],
    },
  ],
  users: [
    {
      id: "u1",
      email: "owner@guestay.test",
      role: "owner",
      status: "active",
      lastLogin: iso(addDays(today, -1)),
    },
    {
      id: "u2",
      email: "manager@guestay.test",
      role: "manager",
      status: "active",
      lastLogin: iso(addDays(today, -2)),
    },
  ],
  ota: [
    {
      id: "o1",
      room: "Shared Room A",
      provider: "airbnb",
      lastSyncedAt: new Date().toISOString(),
      status: "ok",
    },
    {
      id: "o2",
      room: "Private Room",
      provider: "booking_com",
      lastSyncedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      status: "stale",
    },
  ],
  notifications: [
    {
      id: "n1",
      type: "new_booking",
      title: "New booking",
      message: "GST-1003 — Sana Malik booked Private Room",
      at: new Date(Date.now() - 15 * 60000).toISOString(),
      unread: true,
    },
    {
      id: "n2",
      type: "payment_failed",
      title: "Payment failed",
      message: "GST-1002 — Omar Rashid advance payment declined",
      at: new Date(Date.now() - 2 * 3600000).toISOString(),
      unread: true,
    },
    {
      id: "n3",
      type: "refund_request",
      title: "Refund request",
      message: "Hassan Iqbal requested Rs 18,000 refund",
      at: new Date(Date.now() - 5 * 3600000).toISOString(),
      unread: true,
    },
    {
      id: "n4",
      type: "ota_sync_failure",
      title: "OTA sync failure",
      message: "Booking.com feed for Private Room is stale",
      at: new Date(Date.now() - 8 * 3600000).toISOString(),
      unread: false,
    },
  ],
  audit_log: [
    {
      id: "a1",
      actor: "owner@guestay.test",
      action: "refund.approved",
      entity: "GST-0997",
      detail: "Approved Rs 12,000 refund",
      at: new Date(Date.now() - 26 * 3600000).toISOString(),
    },
    {
      id: "a2",
      actor: "manager@guestay.test",
      action: "booking.status_changed",
      entity: "GST-1002",
      detail: "Marked partially paid",
      at: new Date(Date.now() - 30 * 3600000).toISOString(),
    },
    {
      id: "a3",
      actor: "owner@guestay.test",
      action: "room.price_updated",
      entity: "Private Room",
      detail: "Tier 1 price 7500 → 8000",
      at: new Date(Date.now() - 50 * 3600000).toISOString(),
    },
    {
      id: "a4",
      actor: "owner@guestay.test",
      action: "user.invited",
      entity: "manager@guestay.test",
      detail: "Sent magic-link invite (manager)",
      at: new Date(Date.now() - 72 * 3600000).toISOString(),
    },
  ],
};

export const mockStore = {
  list(resource: string) {
    return db[resource] || [];
  },
  get(resource: string, id: string) {
    return (db[resource] || []).find((r) => r.id === id);
  },
  create(resource: string, variables: Record<string, unknown>) {
    const row = { id: `${resource}_${Date.now()}`, ...variables } as Row;
    if (!db[resource]) db[resource] = [];
    db[resource].push(row);
    return row;
  },
  update(resource: string, id: string, variables: Record<string, unknown>) {
    const list = db[resource] || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error("Not found");
    list[idx] = { ...list[idx], ...variables };
    return list[idx];
  },
  remove(resource: string, id: string) {
    const list = db[resource] || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error("Not found");
    const [row] = list.splice(idx, 1);
    return row;
  },
};
