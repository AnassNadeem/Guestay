import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";
import {
  BOOKING_STATUS,
  SOURCE_LABEL,
  statusMeta,
  humanize,
  downloadBlob,
  exportPrintable,
} from "../lib/format";
import { usePageMeta } from "../hooks/usePageMeta";

type Booking = {
  id: string;
  reference: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  source: string;
  status: string;
  paymentStatus?: string;
  paidAt?: string;
  totalPkr?: number;
};

export function BookingsPage() {
  usePageMeta("Bookings", "Search and export Guestay bookings");
  const { data } = useList({ resource: "bookings" });
  const { data: roomData } = useList({ resource: "rooms" });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [room, setRoom] = useState("all");
  const [source, setSource] = useState("all");
  const [payment, setPayment] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const rooms = (roomData?.data || []) as Array<{ id: string; name: string }>;

  const rows = useMemo(() => {
    return ((data?.data || []) as Booking[]).filter((row) => {
      const matchQ =
        !q ||
        row.guest.toLowerCase().includes(q.toLowerCase()) ||
        row.reference.toLowerCase().includes(q.toLowerCase());
      const matchStatus = status === "all" || row.status === status;
      const matchRoom = room === "all" || row.room === room;
      const matchSource = source === "all" || row.source === source;
      const matchPayment = payment === "all" || row.paymentStatus === payment;
      const matchFrom = !from || row.checkOut >= from;
      const matchTo = !to || row.checkIn <= to;
      return matchQ && matchStatus && matchRoom && matchSource && matchPayment && matchFrom && matchTo;
    });
  }, [data, q, status, room, source, payment, from, to]);

  function exportCsv() {
    const header =
      "reference,guest,room,checkIn,checkOut,source,status,paymentStatus,paidAt,totalPkr\n";
    const body = rows
      .map((r) =>
        [
          r.reference,
          r.guest,
          r.room,
          r.checkIn,
          r.checkOut,
          SOURCE_LABEL[r.source] || r.source,
          statusMeta(BOOKING_STATUS, r.status).label,
          humanize(r.paymentStatus || ""),
          r.paidAt ? r.paidAt.slice(0, 10) : "",
          r.totalPkr ?? 0,
        ].join(","),
      )
      .join("\n");
    downloadBlob(header + body, "guestay-bookings.csv", "text/csv");
    setExportOpen(false);
  }

  function exportPdf() {
    const tableHtml = `<table><thead><tr>
      <th>Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Source</th><th>Status</th><th>Payment</th><th>Paid on</th><th>Total</th>
      </tr></thead><tbody>${rows
        .map(
          (r) =>
            `<tr><td>${r.reference}</td><td>${r.guest}</td><td>${r.room}</td><td>${r.checkIn} → ${r.checkOut}</td><td>${
              SOURCE_LABEL[r.source] || r.source
            }</td><td>${statusMeta(BOOKING_STATUS, r.status).label}</td><td>${humanize(
              r.paymentStatus || "",
            )}</td><td>${r.paidAt ? r.paidAt.slice(0, 10) : "-"}</td><td>Rs ${(r.totalPkr ?? 0).toLocaleString()}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    exportPrintable("Guestay Bookings", tableHtml);
    setExportOpen(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1>Bookings</h1>
        <div style={{ position: "relative" }}>
          <button type="button" className="btn secondary" onClick={() => setExportOpen((o) => !o)}>
            Export ▾
          </button>
          {exportOpen && (
            <div className="dropdown" style={{ top: 44, right: 0, width: 160, padding: "0.3rem" }}>
              <button type="button" className="dropdown-item" onClick={exportCsv}>
                Export CSV
              </button>
              <button type="button" className="dropdown-item" onClick={exportPdf}>
                Export PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search guest or reference"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(BOOKING_STATUS)
            .filter(([k]) => !["awaiting_payment", "hold"].includes(k))
            .map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
        </select>
        <select value={room} onChange={(e) => setRoom(e.target.value)}>
          <option value="all">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={payment} onChange={(e) => setPayment(e.target.value)}>
          <option value="all">All payments</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="refunded">Refunded</option>
        </select>
        <label style={{ fontSize: 12, color: "#6b6b60", display: "flex", alignItems: "center", gap: 4 }}>
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "#6b6b60", display: "flex", alignItems: "center", gap: 4 }}>
          To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
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
              <th>Payment</th>
              <th>Paid on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = statusMeta(BOOKING_STATUS, r.status);
              return (
                <tr key={r.id}>
                  <td>{r.reference}</td>
                  <td>{r.guest}</td>
                  <td>{r.room}</td>
                  <td>
                    {r.checkIn} → {r.checkOut}
                  </td>
                  <td>{SOURCE_LABEL[r.source] || r.source}</td>
                  <td>
                    <span className="badge" style={{ background: meta.bg, color: meta.fg }}>
                      {meta.label}
                    </span>
                  </td>
                  <td>{humanize(r.paymentStatus || "")}</td>
                  <td>{r.paidAt ? r.paidAt.slice(0, 10) : "-"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "#9a9a8c", padding: "1.5rem 0.5rem" }}>
                  No bookings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
