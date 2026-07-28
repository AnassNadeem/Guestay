import { useState } from "react";
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

const occupancy = [
  { d: "W1", pct: 62 },
  { d: "W2", pct: 71 },
  { d: "W3", pct: 68 },
  { d: "W4", pct: 80 },
];
const revenueBySource = [
  { name: "Direct", value: 420000 },
  { name: "Airbnb", value: 180000 },
  { name: "Booking.com", value: 95000 },
  { name: "Walk-in", value: 40000 },
];
const statusBreakdown = [
  { name: "Paid", value: 48 },
  { name: "Partial", value: 12 },
  { name: "No advance", value: 6 },
  { name: "Cancelled", value: 4 },
];
const revenueOverTime = [
  { m: "Apr", v: 220000 },
  { m: "May", v: 260000 },
  { m: "Jun", v: 310000 },
  { m: "Jul", v: 290000 },
];
const COLORS = ["#3B4430", "#A6AC7E", "#6B6B60", "#C4A35A"];

export function AnalyticsPage() {
  const [range, setRange] = useState("30");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h1>Analytics</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          style={{ height: 40, borderRadius: 10 }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div className="kpi-grid">
        <div className="kpi">
          <span>Total Revenue</span>
          <strong>Rs 735,000</strong>
        </div>
        <div className="kpi">
          <span>Total Bookings</span>
          <strong>70</strong>
        </div>
        <div className="kpi">
          <span>Avg. Booking Value</span>
          <strong>Rs 10,500</strong>
        </div>
        <div className="kpi">
          <span>Occupancy %</span>
          <strong>72%</strong>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ height: 280 }}>
          <h3>Occupancy % over time</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={occupancy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="d" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pct" stroke="#3B4430" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 280 }}>
          <h3>Revenue by source</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={revenueBySource} dataKey="value" nameKey="name" outerRadius={80}>
                {revenueBySource.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 280 }}>
          <h3>Booking status</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 280 }}>
          <h3>Revenue over time</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="m" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="v" fill="#A6AC7E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
