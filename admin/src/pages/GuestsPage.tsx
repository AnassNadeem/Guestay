import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";
import { useRole } from "../hooks/useRole";
import { useRevenueVisibility } from "../hooks/useRevenueVisibility";
import { EyeIcon, EyeOffIcon } from "../components/icons";

type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  verified?: boolean;
  joinedAt?: string;
};

export function GuestsPage() {
  const { data } = useList({ resource: "guests" });
  const { data: bookingData } = useList({ resource: "bookings" });
  const { canSeeRevenue } = useRole();
  const revenue = useRevenueVisibility();

  const [joinFrom, setJoinFrom] = useState("");
  const [joinTo, setJoinTo] = useState("");
  const [repeatOnly, setRepeatOnly] = useState(false);

  const bookings = (bookingData?.data || []) as Array<{
    guestEmail?: string;
    guest: string;
    status: string;
    totalPkr?: number;
    amountPaidPkr?: number;
  }>;

  const enriched = useMemo(() => {
    return ((data?.data || []) as Guest[]).map((g) => {
      const theirs = bookings.filter(
        (b) => b.guestEmail === g.email || b.guest === g.name,
      );
      const totalBookings = theirs.length;
      // Collected payments only — matches dashboard/analytics revenue.
      const totalSpent = theirs
        .filter((b) => b.status !== "cancelled" && b.status !== "pending_hold")
        .reduce((s, b) => s + Number(b.amountPaidPkr || 0), 0);
      return { ...g, totalBookings, totalSpent };
    });
  }, [data, bookings]);

  const rows = useMemo(() => {
    return enriched.filter((g) => {
      const matchFrom = !joinFrom || (g.joinedAt || "") >= joinFrom;
      const matchTo = !joinTo || (g.joinedAt || "") <= joinTo;
      const matchRepeat = !repeatOnly || g.totalBookings > 1;
      return matchFrom && matchTo && matchRepeat;
    });
  }, [enriched, joinFrom, joinTo, repeatOnly]);

  return (
    <div>
      <h1>Guests / CRM</h1>

      <div className="toolbar">
        <label style={{ fontSize: 12, color: "#6b6b60", display: "flex", alignItems: "center", gap: 4 }}>
          Joined from <input type="date" value={joinFrom} onChange={(e) => setJoinFrom(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "#6b6b60", display: "flex", alignItems: "center", gap: 4 }}>
          to <input type="date" value={joinTo} onChange={(e) => setJoinTo(e.target.value)} />
        </label>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={repeatOnly} onChange={(e) => setRepeatOnly(e.target.checked)} />
          Repeat guests only
        </label>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Verified</th>
              <th>Bookings</th>
              <th>
                Total spent
                {canSeeRevenue && (
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={revenue.toggle}
                    aria-label={revenue.visible ? "Hide spend" : "Show spend"}
                    title={revenue.visible ? "Hide spend" : "Show spend"}
                  >
                    {revenue.visible ? <EyeIcon size={15} /> : <EyeOffIcon size={15} />}
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.email}</td>
                <td>
                  <span
                    title={g.phone}
                    style={{ display: "inline-block", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}
                  >
                    {g.phone}
                  </span>
                </td>
                <td>
                  <span
                    className="badge"
                    style={g.verified ? { background: "#E4F3E8", color: "#1E6B3A" } : { background: "#FDF0D5", color: "#8A6D0B" }}
                  >
                    {g.verified ? "Verified" : "Unverified"}
                  </span>
                </td>
                <td>{g.totalBookings}</td>
                <td>{canSeeRevenue ? revenue.format(g.totalSpent) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "#9a9a8c", padding: "1.5rem 0.5rem" }}>
                  No guests match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
