import { useList } from "@refinedev/core";

export function DashboardPage() {
  const { data: bookings } = useList({ resource: "bookings" });
  const { data: refunds } = useList({ resource: "refunds" });
  const total = (bookings?.data || []).reduce(
    (s, b) => s + Number((b as { totalPkr?: number }).totalPkr || 0),
    0,
  );

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="kpi-grid">
        <div className="kpi">
          <span>Total Revenue</span>
          <strong>Rs {total.toLocaleString()}</strong>
        </div>
        <div className="kpi">
          <span>Bookings</span>
          <strong>{bookings?.total ?? 0}</strong>
        </div>
        <div className="kpi">
          <span>Pending refunds</span>
          <strong>
            {(refunds?.data || []).filter(
              (r) => (r as { status: string }).status === "pending",
            ).length}
          </strong>
        </div>
        <div className="kpi">
          <span>Occupancy</span>
          <strong>72%</strong>
        </div>
      </div>
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
            {(bookings?.data || []).map((b) => {
              const row = b as {
                id: string;
                reference: string;
                guest: string;
                room: string;
                status: string;
              };
              return (
                <tr key={row.id}>
                  <td>{row.reference}</td>
                  <td>{row.guest}</td>
                  <td>{row.room}</td>
                  <td>{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
