type Row = Record<string, unknown> & { id: string };

const db: Record<string, Row[]> = {
  bookings: [
    {
      id: "1",
      reference: "GST-1001",
      guest: "Ayesha Khan",
      room: "Shared Room A",
      checkIn: "2026-08-01",
      checkOut: "2026-08-10",
      source: "direct",
      status: "paid",
      totalPkr: 40000,
    },
    {
      id: "2",
      reference: "GST-1002",
      guest: "Omar R.",
      room: "Private Room",
      checkIn: "2026-08-05",
      checkOut: "2026-08-12",
      source: "airbnb",
      status: "partially_paid",
      totalPkr: 35000,
    },
  ],
  rooms: [
    {
      id: "r1",
      name: "Shared Room A",
      type: "shared_bedroom",
      status: "active",
      capacity: 4,
      tier1: 5000,
      tier2: 4000,
      tier3: 3500,
      tier4: 3000,
    },
    {
      id: "r2",
      name: "Private Room",
      type: "private_room",
      status: "active",
      capacity: 2,
      tier1: 8000,
      tier2: 7000,
      tier3: 6500,
      tier4: 6000,
    },
  ],
  guests: [
    { id: "g1", name: "Ayesha Khan", email: "ayesha@example.com", phone: "+92…" },
  ],
  refunds: [
    {
      id: "rf1",
      bookingId: "1",
      guest: "Ayesha Khan",
      amountPkr: 10000,
      reason: "Change of plans",
      status: "pending",
    },
  ],
  users: [
    {
      id: "u1",
      email: "owner@guestay.test",
      role: "owner",
      status: "active",
      lastLogin: "2026-07-28",
    },
    {
      id: "u2",
      email: "manager@guestay.test",
      role: "manager",
      status: "active",
      lastLogin: "2026-07-27",
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
