import { useGetIdentity, usePermissions } from "@refinedev/core";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/calendar", label: "Calendar" },
  { to: "/bookings", label: "Bookings" },
  { to: "/rooms", label: "Rooms" },
  { to: "/guests", label: "Guests / CRM" },
  { to: "/analytics", label: "Analytics" },
  { to: "/refunds", label: "Refund Requests" },
  { to: "/ota", label: "OTA Sync" },
  { to: "/walk-in", label: "Walk-in" },
  { to: "/users", label: "Staff / Users", ownerOnly: true },
  { to: "/settings", label: "Settings" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: identity } = useGetIdentity<{
    name?: string;
    email?: string;
    role?: string;
  }>();
  const { data: role } = usePermissions<string>();
  const navigate = useNavigate();
  const isOwner = (role || identity?.role) === "owner";

  return (
    <div className={`admin-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 0.5rem 1rem",
          }}
        >
          {!collapsed && (
            <strong style={{ color: "var(--olive)" }}>Guestay Admin</strong>
          )}
          <button
            type="button"
            className="btn secondary"
            style={{ height: 32, padding: "0 0.6rem" }}
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>
        {NAV.filter((n) => !n.ownerOnly || isOwner).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <span>{collapsed ? item.label.slice(0, 1) : item.label}</span>
          </NavLink>
        ))}
      </aside>
      <div>
        <header className="topbar">
          <input
            placeholder="Search bookings, guests, rooms…"
            style={{
              flex: 1,
              maxWidth: 420,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(59,68,48,0.15)",
              padding: "0 1rem",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn secondary"
              aria-label="Notifications"
              title="Sync failures, bookings, payments, refunds"
            >
              🔔
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {identity?.name || "Staff"}
              </div>
              <div style={{ fontSize: 12, color: "#6b6b60" }}>
                {identity?.email}
              </div>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={() => navigate("/settings")}
            >
              Profile
            </button>
            <Link to="/login" className="btn secondary" onClick={() => localStorage.removeItem("guestay_admin_user")}>
              Sign out
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
