import { useGetIdentity, useList, useLogout } from "@refinedev/core";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRole } from "../hooks/useRole";
import { SITE_URL } from "../lib/format";
import {
  DashboardIcon,
  CalendarIcon,
  BookingsIcon,
  RoomsIcon,
  GuestsIcon,
  AnalyticsIcon,
  RefundsIcon,
  OtaIcon,
  WalkInIcon,
  StaffIcon,
  AuditIcon,
  SettingsIcon,
  LogOutIcon,
  SearchIcon,
  BellIcon,
  ExternalLinkIcon,
} from "../components/icons";

type NavItem = {
  to: string;
  label: string;
  icon: (p: { size?: number }) => JSX.Element;
  end?: boolean;
  ownerOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: DashboardIcon, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/bookings", label: "Bookings", icon: BookingsIcon },
  { to: "/rooms", label: "Rooms", icon: RoomsIcon, ownerOnly: true },
  { to: "/guests", label: "Guests / CRM", icon: GuestsIcon },
  { to: "/analytics", label: "Analytics", icon: AnalyticsIcon, ownerOnly: true },
  { to: "/refunds", label: "Refund Requests", icon: RefundsIcon },
  { to: "/ota", label: "OTA Sync", icon: OtaIcon },
  { to: "/walk-in", label: "Walk-in", icon: WalkInIcon },
  { to: "/users", label: "Staff / Users", icon: StaffIcon, ownerOnly: true },
  { to: "/audit-log", label: "Audit Log", icon: AuditIcon, ownerOnly: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

function initials(name?: string, email?: string) {
  const source = name || email || "G";
  const parts = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "G").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: identity } = useGetIdentity<{
    name?: string;
    email?: string;
    role?: string;
  }>();
  const { isOwner } = useRole();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();

  const { data: bookings } = useList({ resource: "bookings" });
  const { data: rooms } = useList({ resource: "rooms" });
  const { data: guests } = useList({ resource: "guests" });
  const { data: notifications } = useList({ resource: "notifications" });

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchRef = useOutsideClose<HTMLDivElement>(() => setSearchOpen(false));
  const bellRef = useOutsideClose<HTMLDivElement>(() => setBellOpen(false));
  const profileRef = useOutsideClose<HTMLDivElement>(() => setProfileOpen(false));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { bookings: [], rooms: [], guests: [] };
    const b = (bookings?.data || []).filter((r) => {
      const row = r as { guest: string; reference: string };
      return (
        row.guest.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q)
      );
    });
    const rm = (rooms?.data || []).filter((r) =>
      (r as { name: string }).name.toLowerCase().includes(q),
    );
    const g = (guests?.data || []).filter((r) => {
      const row = r as { name: string; email: string; phone: string };
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.phone || "").toLowerCase().includes(q)
      );
    });
    return { bookings: b.slice(0, 5), rooms: rm.slice(0, 5), guests: g.slice(0, 5) };
  }, [query, bookings, rooms, guests]);

  const hasResults =
    results.bookings.length + results.rooms.length + results.guests.length > 0;

  const notifs = (notifications?.data || []) as Array<{
    id: string;
    title: string;
    message: string;
    at: string;
    unread: boolean;
  }>;
  const unreadCount = notifs.filter((n) => n.unread).length;

  const visibleNav = NAV.filter((n) => !n.ownerOnly || isOwner);

  function doSignOut() {
    localStorage.removeItem("guestay_admin_user");
    logout();
  }

  return (
    <div className={`admin-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          {!collapsed && (
            <strong style={{ color: "var(--olive)" }}>Guestay Admin</strong>
          )}
          <button
            type="button"
            className="btn secondary icon-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            title="View Storefront"
            className="storefront-link"
          >
            <ExternalLinkIcon size={18} />
            {!collapsed && <span>View Storefront</span>}
          </a>
          <button
            type="button"
            className="signout-link"
            title="Sign Out"
            onClick={doSignOut}
          >
            <LogOutIcon size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div>
        <header className="topbar">
          <div className="search-wrap" ref={searchRef}>
            <SearchIcon size={18} />
            <input
              value={query}
              placeholder="Search bookings, guests, rooms…"
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
            />
            {searchOpen && query.trim() && (
              <div className="dropdown search-dropdown">
                {!hasResults && (
                  <div className="dropdown-empty">No matches for “{query}”</div>
                )}
                {results.bookings.length > 0 && (
                  <div className="dropdown-group">
                    <div className="dropdown-group-title">Bookings</div>
                    {results.bookings.map((b) => {
                      const r = b as { id: string; guest: string; reference: string };
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="dropdown-item"
                          onMouseDown={() => {
                            navigate("/bookings");
                            setSearchOpen(false);
                          }}
                        >
                          <strong>{r.reference}</strong> · {r.guest}
                        </button>
                      );
                    })}
                  </div>
                )}
                {results.rooms.length > 0 && (
                  <div className="dropdown-group">
                    <div className="dropdown-group-title">Rooms</div>
                    {results.rooms.map((b) => {
                      const r = b as { id: string; name: string };
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="dropdown-item"
                          onMouseDown={() => {
                            navigate("/rooms");
                            setSearchOpen(false);
                          }}
                        >
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {results.guests.length > 0 && (
                  <div className="dropdown-group">
                    <div className="dropdown-group-title">Guests</div>
                    {results.guests.map((b) => {
                      const r = b as { id: string; name: string; email: string };
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="dropdown-item"
                          onMouseDown={() => {
                            navigate("/guests");
                            setSearchOpen(false);
                          }}
                        >
                          {r.name} <span className="muted">· {r.email}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className="bell-wrap" ref={bellRef}>
              <button
                type="button"
                className="btn secondary icon-btn"
                aria-label="Notifications"
                onClick={() => setBellOpen((o) => !o)}
              >
                <BellIcon size={18} />
                {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
              </button>
              {bellOpen && (
                <div className="dropdown notif-dropdown">
                  <div className="dropdown-group-title">Notifications</div>
                  {notifs.length === 0 && (
                    <div className="dropdown-empty">You’re all caught up.</div>
                  )}
                  {notifs.map((n) => (
                    <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">{timeAgo(n.at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Account menu"
              >
                <span className="avatar">
                  {initials(identity?.name, identity?.email)}
                </span>
              </button>
              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  <div className="profile-head">
                    <div style={{ fontWeight: 600 }}>{identity?.name || "Staff"}</div>
                    <div className="muted">{identity?.email}</div>
                  </div>
                  <button
                    type="button"
                    className="dropdown-item"
                    onMouseDown={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                  >
                    Manage Account
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onMouseDown={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    className="dropdown-item danger"
                    onMouseDown={doSignOut}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
