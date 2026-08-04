import { useList } from "@refinedev/core";
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
  usePageMeta("Guests", "Guest directory and spend overview");
  const { data } = useList({ resource: "guests" });
  const { data: bookingData } = useList({ resource: "bookings" });
  const { canSeeRevenue } = useRole();
  const revenue = useRevenueVisibility();

  const [preset, setPreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [q, setQ] = useState("");

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
      const totalSpent = theirs
        .filter((b) => b.status !== "cancelled" && b.status !== "pending_hold")
        .reduce((s, b) => s + Number(b.amountPaidPkr || 0), 0);
      return { ...g, totalBookings, totalSpent };
    });
  }, [data, bookings]);

  const rows = useMemo(() => {
    const range = rangeFromPreset(preset, customFrom, customTo);
    const query = q.trim().toLowerCase();
    return enriched.filter((g) => {
      const matchQ =
        !query ||
        g.name.toLowerCase().includes(query) ||
        g.email.toLowerCase().includes(query) ||
        (g.phone || "").toLowerCase().includes(query);
      const matchDate = !range || inDateRange(g.joinedAt, range.from, range.to);
      const matchRepeat = !repeatOnly || g.totalBookings > 1;
      return matchQ && matchDate && matchRepeat;
    });
  }, [enriched, preset, customFrom, customTo, repeatOnly, q]);

  const pager = useTablePager(rows, 10);

  return (
    <div>
      <h1>Guests</h1>

      <div className="card" style={{ marginTop: 8 }}>
        <div className="card-toolbar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone"
            style={{ height: 36, minWidth: 200, borderRadius: 8, border: "1px solid rgba(59,68,48,0.2)", padding: "0 10px" }}
          />
          <div className="card-toolbar-filters">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
              aria-label="Joined within"
            >
              <option value="all">All time</option>
              <option value="7">Joined last 7 days</option>
              <option value="15">Joined last 15 days</option>
              <option value="30">Joined last 30 days</option>
              <option value="90">Joined last 90 days</option>
              <option value="custom">Custom dates</option>
            </select>
            {preset === "custom" && (
              <>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </>
            )}
            <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={repeatOnly} onChange={(e) => setRepeatOnly(e.target.checked)} />
              Repeat only
            </label>
          </div>
        </div>

        <table className="table compact">
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
            {pager.pageRows.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.email}</td>
                <td>
                  <span
                    title={g.phone}
                    style={{
                      display: "inline-block",
                      maxWidth: 130,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      verticalAlign: "bottom",
                    }}
                  >
                    {g.phone}
                  </span>
                </td>
                <td>
                  <span
                    className="badge"
                    style={
                      g.verified
                        ? { background: "#E4F3E8", color: "#1E6B3A" }
                        : { background: "#FDF0D5", color: "#8A6D0B" }
                    }
                  >
                    {g.verified ? "Verified" : "Unverified"}
                  </span>
                </td>
                <td>{g.totalBookings}</td>
                <td>{canSeeRevenue ? revenue.format(g.totalSpent) : "-"}</td>
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
