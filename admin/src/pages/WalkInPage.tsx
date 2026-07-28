import { useState } from "react";

export function WalkInPage() {
  const [form, setForm] = useState({
    roomSlug: "",
    guestName: "",
    guestPhone: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
    amountCollectedPkr: 0,
    notes: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const site = import.meta.env.VITE_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${site}/api/admin/walk-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        mode: "exclusive",
        roomName: form.roomSlug,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Walk-in booked: ${data.booking?.reference || "ok"}`);
  }

  return (
    <div>
      <h1>Walk-in booking</h1>
      <form className="card" style={{ maxWidth: 480, marginTop: 16 }} onSubmit={submit}>
        {(
          [
            ["roomSlug", "Room slug"],
            ["guestName", "Guest name"],
            ["guestPhone", "Phone"],
            ["checkIn", "Check-in", "date"],
            ["checkOut", "Check-out", "date"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} style={{ display: "block", marginBottom: 10, fontSize: 14 }}>
            {label}
            <input
              type={type || "text"}
              required
              value={String((form as Record<string, string | number>)[key])}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              style={{
                display: "block",
                width: "100%",
                height: 40,
                marginTop: 4,
                borderRadius: 8,
                border: "1px solid #ccc",
                padding: "0 10px",
              }}
            />
          </label>
        ))}
        <label style={{ display: "block", marginBottom: 10, fontSize: 14 }}>
          Amount collected (PKR)
          <input
            type="number"
            value={form.amountCollectedPkr}
            onChange={(e) =>
              setForm({ ...form, amountCollectedPkr: Number(e.target.value) })
            }
            style={{
              display: "block",
              width: "100%",
              height: 40,
              marginTop: 4,
              borderRadius: 8,
              border: "1px solid #ccc",
              padding: "0 10px",
            }}
          />
        </label>
        <button type="submit" className="btn" style={{ width: "100%" }}>
          Create walk-in
        </button>
        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      </form>
    </div>
  );
}
