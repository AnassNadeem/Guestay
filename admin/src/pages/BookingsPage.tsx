import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";

export function BookingsPage() {
  const { data } = useList({ resource: "bookings" });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    return (data?.data || []).filter((b) => {
      const row = b as {
        guest: string;
        reference: string;
        status: string;
        source: string;
      };
      const matchQ =
        !q ||
        row.guest.toLowerCase().includes(q.toLowerCase()) ||
        row.reference.toLowerCase().includes(q.toLowerCase());
      const matchS = status === "all" || row.status === status;
      return matchQ && matchS;
    });
  }, [data, q, status]);

  function exportCsv() {
    const header = "reference,guest,room,checkIn,checkOut,source,status,totalPkr\n";
    const body = rows
      .map((b) => {
        const r = b as Record<string, string | number>;
        return [r.reference, r.guest, r.room, r.checkIn, r.checkOut, r.source, r.status, r.totalPkr].join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guestay-bookings.csv";
    a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h1>Bookings / CRM</h1>
        <button type="button" className="btn secondary" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guest or reference"
          style={{ height: 40, borderRadius: 10, border: "1px solid #ccc", padding: "0 12px", flex: 1 }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ height: 40, borderRadius: 10 }}
        >
          <option value="all">All statuses</option>
          <option value="pending_hold">awaiting_payment / hold</option>
          <option value="partially_paid">partially_paid</option>
          <option value="paid">paid</option>
          <option value="confirmed_no_advance">confirmed_no_advance</option>
          <option value="cancelled">cancelled</option>
          <option value="completed">completed</option>
        </select>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Dates</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const r = b as {
                id: string;
                reference: string;
                guest: string;
                room: string;
                checkIn: string;
                checkOut: string;
                source: string;
                status: string;
              };
              return (
                <tr key={r.id}>
                  <td>{r.reference}</td>
                  <td>{r.guest}</td>
                  <td>{r.room}</td>
                  <td>
                    {r.checkIn} → {r.checkOut}
                  </td>
                  <td>{r.source}</td>
                  <td>{r.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
