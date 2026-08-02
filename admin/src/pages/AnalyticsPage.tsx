import { useList } from "@refinedev/core";
import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useRole } from "../hooks/useRole";
import { useRevenueVisibility } from "../hooks/useRevenueVisibility";
import {
  SOURCE_COLOR,
  SOURCE_LABEL,
  BOOKING_STATUS,
  statusMeta,
  nights,
  exportPrintable,
  downloadBlob,
} from "../lib/format";
import { EyeIcon, EyeOffIcon } from "../components/icons";

type Booking = {
  id: string;
  guest: string;
  guestEmail?: string;
  room: string;
  source: string;
  status: string;
  paymentStatus?: string;
  checkIn: string;
  checkOut: string;
  totalPkr?: number;
  amountPaidPkr?: number;
};

const STATUS_COLORS: Record<string, string> = {
  paid: "#1E6B3A",
  partially_paid: "#0B5A8A",
  confirmed_no_advance: "#4B3B8A",
  completed: "#3B4430",
  cancelled: "#B42318",
  pending_hold: "#8A6D0B",
};

const PAYMENT_METHOD: Record<string, string> = {
  direct: "Card (online)",
  walk_in: "Cash",
  airbnb: "Airbnb payout",
  booking_com: "Booking.com payout",
};

const PAYMENT_COLORS = ["#3B4430", "#A6AC7E", "#FF5A5F", "#003580"];

export function AnalyticsPage() {
  const { canSeeAnalytics } = useRole();
  const revenue = useRevenueVisibility();
  const { data } = useList({ resource: "bookings" });

  const [preset, setPreset] = useState("90");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const bookings = (data?.data || []) as Booking[];

  const { start, end } = useMemo(() => {
    if (preset === "custom" && (from || to)) {
      return { start: from || "0000-01-01", end: to || "9999-12-31" };
    }
    const days = Number(preset) || 90;
    const s = new Date();
    s.setDate(s.getDate() - days);
    return { start: s.toISOString().slice(0, 10), end: "9999-12-31" };
  }, [preset, from, to]);

  const filtered = useMemo(
    () => bookings.filter((b) => b.checkIn >= start && b.checkIn <= end),
    [bookings, start, end],
  );

  const active = filtered.filter(
    (b) => b.status !== "cancelled" && b.status !== "pending_hold",
  );

  // Collected money (amount paid), not gross booking total.
  const collected = (b: Booking) => Number(b.amountPaidPkr || 0);
  const totalRevenue = active.reduce((s, b) => s + collected(b), 0);
  const totalBookings = filtered.length;
  const avgBookingValue = active.length ? Math.round(totalRevenue / active.length) : 0;
  const totalNights = active.reduce((s, b) => s + nights(b.checkIn, b.checkOut), 0);
  const avgStay = active.length ? (totalNights / active.length).toFixed(1) : "0";
  const adr = totalNights ? Math.round(totalRevenue / totalNights) : 0;
  const cancellationRate = totalBookings
    ? Math.round((filtered.filter((b) => b.status === "cancelled").length / totalBookings) * 100)
    : 0;

  const repeatRate = useMemo(() => {
    const byGuest = new Map<string, number>();
    filtered.forEach((b) => {
      const key = b.guestEmail || b.guest;
      byGuest.set(key, (byGuest.get(key) || 0) + 1);
    });
    const guests = [...byGuest.values()];
    if (!guests.length) return 0;
    return Math.round((guests.filter((c) => c > 1).length / guests.length) * 100);
  }, [filtered]);

  const revenueOverTime = useMemo(() => {
    const byMonth = new Map<string, number>();
    active.forEach((b) => {
      const m = b.checkIn.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) || 0) + collected(b));
    });
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({
        m: new Date(`${m}-01`).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        v,
      }));
  }, [active]);

  const revenueBySource = useMemo(() => {
    const bySrc = new Map<string, number>();
    active.forEach((b) => bySrc.set(b.source, (bySrc.get(b.source) || 0) + collected(b)));
    return [...bySrc.entries()].map(([k, v]) => ({
      key: k,
      name: SOURCE_LABEL[k] || k,
      value: v,
      color: SOURCE_COLOR[k] || "#6B6B60",
    }));
  }, [active]);

  const statusBreakdown = useMemo(() => {
    const byStatus = new Map<string, number>();
    filtered.forEach((b) => byStatus.set(b.status, (byStatus.get(b.status) || 0) + 1));
    return [...byStatus.entries()].map(([k, v]) => ({
      key: k,
      name: statusMeta(BOOKING_STATUS, k).label,
      value: v,
      color: STATUS_COLORS[k] || "#6B6B60",
    }));
  }, [filtered]);

  const topRooms = useMemo(() => {
    const byRoom = new Map<string, number>();
    active.forEach((b) => byRoom.set(b.room, (byRoom.get(b.room) || 0) + collected(b)));
    return [...byRoom.entries()].sort(([, a], [, b]) => b - a).map(([room, value]) => ({ room, value }));
  }, [active]);

  const paymentBreakdown = useMemo(() => {
    const byMethod = new Map<string, number>();
    active.forEach((b) => {
      const method = PAYMENT_METHOD[b.source] || "Other";
      byMethod.set(method, (byMethod.get(method) || 0) + 1);
    });
    return [...byMethod.entries()].map(([name, value]) => ({ name, value }));
  }, [active]);

  function exportCsv() {
    const lines = [
      "metric,value",
      `Total Revenue,${totalRevenue}`,
      `Total Bookings,${totalBookings}`,
      `Avg Booking Value,${avgBookingValue}`,
      `Avg Length of Stay (nights),${avgStay}`,
      `Repeat-guest Rate (%),${repeatRate}`,
      `Cancellation Rate (%),${cancellationRate}`,
      `ADR,${adr}`,
      "",
      "room,revenue",
      ...topRooms.map((r) => `${r.room},${r.value}`),
    ];
    downloadBlob(lines.join("\n"), "guestay-analytics.csv", "text/csv");
  }

  function exportPdf() {
    const html = `
      <table><tbody>
        <tr><th>Total Revenue</th><td>Rs ${totalRevenue.toLocaleString()}</td></tr>
        <tr><th>Total Bookings</th><td>${totalBookings}</td></tr>
        <tr><th>Avg Booking Value</th><td>Rs ${avgBookingValue.toLocaleString()}</td></tr>
        <tr><th>Avg Length of Stay</th><td>${avgStay} nights</td></tr>
        <tr><th>Repeat-guest Rate</th><td>${repeatRate}%</td></tr>
        <tr><th>Cancellation Rate</th><td>${cancellationRate}%</td></tr>
        <tr><th>ADR</th><td>Rs ${adr.toLocaleString()}</td></tr>
      </tbody></table>
      <h3>Top-performing rooms</h3>
      <table><thead><tr><th>Room</th><th>Revenue</th></tr></thead><tbody>
      ${topRooms.map((r) => `<tr><td>${r.room}</td><td>Rs ${r.value.toLocaleString()}</td></tr>`).join("")}
      </tbody></table>`;
    exportPrintable("Guestay Analytics", html);
  }

  if (!canSeeAnalytics) return <Navigate to="/" replace />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h1>Analytics</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} style={{ height: 40, borderRadius: 10, padding: "0 10px" }}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
            <option value="custom">Custom range</option>
          </select>
          {preset === "custom" && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ height: 40, borderRadius: 10, padding: "0 10px", border: "1px solid rgba(59,68,48,0.2)" }} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ height: 40, borderRadius: 10, padding: "0 10px", border: "1px solid rgba(59,68,48,0.2)" }} />
            </>
          )}
          <button type="button" className="btn secondary" onClick={exportCsv}>Export CSV</button>
          <button type="button" className="btn secondary" onClick={exportPdf}>Export PDF</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <span>
            Total Revenue
            <button type="button" className="eye-btn" onClick={revenue.toggle} aria-label="Toggle revenue">
              {revenue.visible ? <EyeIcon size={15} /> : <EyeOffIcon size={15} />}
            </button>
          </span>
          <strong>{revenue.format(totalRevenue)}</strong>
        </div>
        <div className="kpi"><span>Total Bookings</span><strong>{totalBookings}</strong></div>
        <div className="kpi"><span>Avg. Booking Value</span><strong>{revenue.format(avgBookingValue)}</strong></div>
        <div className="kpi"><span>Avg. Length of Stay</span><strong>{avgStay} nights</strong></div>
        <div className="kpi"><span>Repeat-guest Rate</span><strong>{repeatRate}%</strong></div>
        <div className="kpi"><span>Cancellation Rate</span><strong>{cancellationRate}%</strong></div>
        <div className="kpi"><span>ADR (per room-night)</span><strong>{revenue.format(adr)}</strong></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ height: 300 }}>
          <h3>Revenue over time</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="m" />
              <YAxis />
              <Tooltip formatter={(v: number) => `Rs ${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="v" stroke="#3B4430" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: 300 }}>
          <h3>Revenue by source</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={revenueBySource} dataKey="value" nameKey="name" outerRadius={80}>
                {revenueBySource.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `Rs ${v.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: 300 }}>
          <h3>Booking status</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                {statusBreakdown.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: 300 }}>
          <h3>Payment-method breakdown</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={paymentBreakdown} dataKey="value" nameKey="name" outerRadius={80}>
                {paymentBreakdown.map((_, i) => (
                  <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: 300, gridColumn: "1 / -1" }}>
          <h3>Top-performing rooms (revenue)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={topRooms} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="room" width={140} />
              <Tooltip formatter={(v: number) => `Rs ${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="#A6AC7E" radius={[0, 6, 6, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
