import { useList } from "@refinedev/core";
import { useState } from "react";
import { adminAuthHeaders } from "../lib/adminAuthHeaders";
import { SITE_URL } from "../lib/format";

export function WalkInPage() {
  const { data: roomData } = useList({ resource: "rooms" });
  const rooms = (roomData?.data || []) as Array<{ id: string; name: string; status: string }>;

  const [form, setForm] = useState({
    roomName: "",
    guestName: "",
    guestPhone: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
    amountCollectedPkr: 0,
    notes: "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch(`${SITE_URL}/api/admin/walk-in`, {
        method: "POST",
        headers: await adminAuthHeaders(),
        body: JSON.stringify({ ...form, mode: "exclusive" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Failed to create walk-in" });
        return;
      }
      setMsg({ ok: true, text: `Walk-in booked: ${data.booking?.reference || "ok"}` });
    } catch {
      setMsg({ ok: false, text: "Could not reach the booking API (is the site running?)." });
    }
  }

  return (
    <div className="centered-page">
      <h1 style={{ textAlign: "center" }}>Walk-in booking</h1>
      <p style={{ textAlign: "center", color: "#6b6b60", marginTop: 0 }}>
        Create a booking for a guest checking in at the property.
      </p>
      <form className="card" style={{ marginTop: 16 }} onSubmit={submit}>
        <label className="field">
          Room
          <select
            required
            value={form.roomName}
            onChange={(e) => setForm({ ...form, roomName: e.target.value })}
          >
            <option value="">Select a room…</option>
            {rooms
              .filter((r) => r.status === "active")
              .map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>

        <label className="field">
          Guest name
          <input
            required
            value={form.guestName}
            onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          />
        </label>

        <label className="field">
          Phone
          <input
            required
            value={form.guestPhone}
            onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            Check-in
            <input
              type="date"
              required
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
          </label>
          <label className="field">
            Check-out
            <input
              type="date"
              required
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            Guests
            <input
              type="number"
              min={1}
              value={form.guests}
              onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Amount collected (PKR)
            <input
              type="number"
              min={0}
              value={form.amountCollectedPkr}
              onChange={(e) => setForm({ ...form, amountCollectedPkr: Number(e.target.value) })}
            />
          </label>
        </div>

        <label className="field">
          Notes
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>

        <button type="submit" className="btn" style={{ width: "100%" }}>
          Create walk-in
        </button>
        {msg && (
          <p style={{ marginTop: 12, color: msg.ok ? "#1E6B3A" : "#b42318", fontSize: 14 }}>{msg.text}</p>
        )}
      </form>
    </div>
  );
}
