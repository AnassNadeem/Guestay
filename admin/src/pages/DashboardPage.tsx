import { useList } from "@refinedev/core";
import { Link } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import { useRevenueVisibility } from "../hooks/useRevenueVisibility";
import { statusMeta, BOOKING_STATUS, isToday } from "../lib/format";
import { EyeIcon, EyeOffIcon } from "../components/icons";

export function DashboardPage() {
  const { data: bookings } = useList({ resource: "bookings" });
  const { data: refunds } = useList({ resource: "refunds" });
  const { data: ota } = useList({ resource: "ota" });
  const { canSeeRevenue } = useRole();
  const revenue = useRevenueVisibility();

  const rows = (bookings?.data || []) as Array<{
    id: string;
    reference: string;
    guest: string;
    room: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalPkr: number;
  }>;

  const total = rows.reduce((s, b) => s + Number(b.totalPkr || 0), 0);
  const checkInsToday = rows.filter((b) => isToday(b.checkIn) && b.status !== "cancelled").length;
  const checkOutsToday = rows.filter((b) => isToday(b.checkOut) && b.status !== "cancelled").length;
  const pendingRefunds = (refunds?.data || []).filter(
    (r) => (r as { status: string }).status === "pending",
  ).length;

  const otaRows = (ota?.data || []) as Array<{ status: string }>;
  const otaHealthy = otaRows.every((o) => o.status === "ok");
  const otaStale = otaRows.filter((o) => o.status !== "ok").length;

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
          <span>Today’s Check-ins</span>
          <strong>{checkInsToday}</strong>
        </div>
        <div className="kpi">
          <span>Today’s Check-outs</span>
          <strong>{checkOutsToday}</strong>
        </div>
        <div className="kpi">
          <span>Pending refunds</span>
          <strong>{pendingRefunds}</strong>
        </div>
        <div className="kpi">
          <span>Occupancy</span>
          <strong>72%</strong>
        </div>
      </div>

      <Link to="/ota" className="card" style={{ display: "block", textDecoration: "none", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--olive)" }}>OTA Sync Health</h3>
            <p style={{ margin: "4px 0 0", color: "#6b6b60", fontSize: 14 }}>
              {otaHealthy
                ? "All channel feeds are up to date."
                : `${otaStale} feed${otaStale > 1 ? "s" : ""} need attention. View OTA Sync →`}
            </p>
          </div>
          <span
            className="badge"
            style={
              otaHealthy
                ? { background: "#E4F3E8", color: "#1E6B3A" }
                : { background: "#FBE4E4", color: "#B42318" }
            }
          >
            {otaHealthy ? "Healthy" : "Attention needed"}
          </span>
        </div>
      </Link>

      <div className="card">
        <h2>Recent bookings</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Guest</th>
              <th>Room</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
