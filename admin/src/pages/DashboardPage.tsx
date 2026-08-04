import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useRole } from "../hooks/useRole";
import { useRevenueVisibility } from "../hooks/useRevenueVisibility";
import { usePageMeta } from "../hooks/usePageMeta";
import { useTablePager } from "../hooks/useTablePager";
import { TablePagination } from "../components/TablePagination";
import {
  DatePreset,
  inDateRange,
  rangeFromPreset,
} from "../lib/dateRange";
import { statusMeta, BOOKING_STATUS, isToday } from "../lib/format";
import { EyeIcon, EyeOffIcon } from "../components/icons";

/** Booked room-nights overlapping the current calendar month ÷ (active rooms × days). */
function monthOccupancyPct(
  bookings: Array<{ checkIn: string; checkOut: string; status: string }>,
  activeRoomCount: number,
): number {
  if (activeRoomCount <= 0) return 0;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStart = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const capacity = activeRoomCount * daysInMonth;
  if (capacity <= 0) return 0;

  let bookedNights = 0;
  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "pending_hold" || b.status === "expired_hold") {
      continue;
    }
    const start = new Date(`${b.checkIn}T00:00:00`);
    const end = new Date(`${b.checkOut}T00:00:00`);
    const overlapStart = start > monthStart ? start : monthStart;
    const overlapEnd = end < new Date(y, m + 1, 1) ? end : new Date(y, m + 1, 1);
    const ms = overlapEnd.getTime() - overlapStart.getTime();
    if (ms > 0) bookedNights += Math.round(ms / 86_400_000);
  }

  return Math.min(100, Math.round((bookedNights / capacity) * 100));
}

export function DashboardPage() {
  usePageMeta("Dashboard", "Guestay Admin overview and recent bookings");
  const { data: bookings } = useList({ resource: "bookings" });
  const { data: refunds } = useList({ resource: "refunds" });
  const { data: ota } = useList({ resource: "ota" });
  const { data: rooms } = useList({ resource: "rooms" });
  const { canSeeRevenue } = useRole();
  const revenue = useRevenueVisibility();

  const [preset, setPreset] = useState<DatePreset>("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [status, setStatus] = useState("all");
  const [room, setRoom] = useState("all");

  const rows = (bookings?.data || []) as Array<{
    id: string;
    reference: string;
    guest: string;
    room: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalPkr: number;
    amountPaidPkr?: number;
    createdAt?: string;
  }>;

  const roomOptions = useMemo(() => {
    const active = ((rooms?.data || []) as Array<{ id: string; name: string; status?: string }>)
      .filter((r) => !r.status || r.status === "active")
      .map((r) => r.name)
      .filter(Boolean);
    return [...new Set(active)].sort();
  }, [rooms]);

  const total = rows
    .filter((b) => b.status !== "cancelled" && b.status !== "pending_hold" && b.status !== "expired_hold")
    .reduce((s, b) => s + Number(b.amountPaidPkr || 0), 0);
  const checkInsToday = rows.filter((b) => isToday(b.checkIn) && b.status !== "cancelled").length;
  const checkOutsToday = rows.filter((b) => isToday(b.checkOut) && b.status !== "cancelled").length;
  const pendingRefunds = (refunds?.data || []).filter(
    (r) => (r as { status: string }).status === "pending",
  ).length;

  const activeRooms = ((rooms?.data || []) as Array<{ status?: string }>).filter(
    (r) => !r.status || r.status === "active",
  ).length;

  const occupancyPct = useMemo(
    () => monthOccupancyPct(rows, activeRooms),
    [rows, activeRooms],
  );

  const otaRows = (ota?.data || []) as Array<{ status: string }>;
  const otaConnected = otaRows.length > 0;
  const otaHealthy = otaConnected && otaRows.every((o) => o.status === "ok");
  const otaStale = otaRows.filter((o) => o.status !== "ok").length;

  const filtered = useMemo(() => {
    const range = rangeFromPreset(preset, customFrom, customTo);
    return rows.filter((row) => {
      const dateKey = row.createdAt || row.checkIn;
      const matchDate = !range || inDateRange(dateKey, range.from, range.to);
      const matchStatus = status === "all" || row.status === status;
      const matchRoom = room === "all" || row.room === room;
      return matchDate && matchStatus && matchRoom;
    });
  }, [rows, preset, customFrom, customTo, status, room]);

  const pager = useTablePager(filtered, 10);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="kpi-grid">
        {canSeeRevenue && (
          <div className="kpi">
            <span>
              Total Revenue
              <button
                type="button"
                className="eye-btn"
                onClick={revenue.toggle}
                aria-label={revenue.visible ? "Hide revenue" : "Show revenue"}
                title={revenue.visible ? "Hide revenue" : "Show revenue"}
              >
                {revenue.visible ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
              </button>
            </span>
            <strong>{revenue.format(total)}</strong>
          </div>
        )}
        <div className="kpi">
          <span>Bookings</span>
          <strong>{bookings?.total ?? 0}</strong>
        </div>
        <div className="kpi">
          <span>Today's Check-ins</span>
          <strong>{checkInsToday}</strong>
        </div>
        <div className="kpi">
          <span>Today's Check-outs</span>
          <strong>{checkOutsToday}</strong>
        </div>
        <div className="kpi">
          <span>Pending refunds</span>
          <strong>{pendingRefunds}</strong>
        </div>
        <div className="kpi">
          <span>Occupancy (this month)</span>
          <strong>{occupancyPct}%</strong>
        </div>
      </div>

      <Link to="/ota" className="card" style={{ display: "block", textDecoration: "none", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--olive)" }}>OTA Sync Health</h3>
            <p style={{ margin: "4px 0 0", color: "#6b6b60", fontSize: 14 }}>
              {!otaConnected
                ? "OTA sync not yet connected."
                : otaHealthy
                  ? "All channel feeds are up to date."
                  : `${otaStale} feed${otaStale > 1 ? "s" : ""} need attention.`}
            </p>
          </div>
          <span
            className="badge"
            style={
              !otaConnected
                ? { background: "#EAECE4", color: "#3B4430" }
                : otaHealthy
                  ? { background: "#E4F3E8", color: "#1E6B3A" }
                  : { background: "#FBE4E4", color: "#B42318" }
            }
          >
            {!otaConnected ? "Not connected" : otaHealthy ? "Healthy" : "Attention needed"}
          </span>
        </div>
      </Link>

      <div className="card">
        <div className="card-toolbar">
          <h2 style={{ margin: 0 }}>Recent bookings</h2>
          <div className="card-toolbar-filters">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
              aria-label="Date range"
            >
              <option value="7">Last 7 days</option>
              <option value="15">Last 15 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom</option>
            </select>
            {preset === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="To date"
                />
              </>
            )}
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="all">All statuses</option>
              {Object.entries(BOOKING_STATUS)
                .filter(([k]) => !["awaiting_payment", "hold"].includes(k))
                .map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
            </select>
            <select value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Room">
              <option value="all">All rooms</option>
              {roomOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <table className="table compact">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pager.pageRows.map((row) => {
              const meta = statusMeta(BOOKING_STATUS, row.status);
              return (
                <tr key={row.id}>
                  <td>{row.reference}</td>
                  <td>{row.guest}</td>
                  <td>{row.room}</td>
                  <td>
                    <span className="badge" style={{ background: meta.bg, color: meta.fg }}>
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "#9a9a8c", padding: "1.5rem 0.5rem" }}>
                  No bookings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination
          page={pager.page}
          totalPages={pager.totalPages}
          pageSize={pager.pageSize}
          total={pager.total}
          onPageChange={pager.setPage}
          onPageSizeChange={pager.setPageSize}
        />
      </div>
    </div>
  );
}
