import { useList, useUpdate, usePermissions } from "@refinedev/core";

export function RefundsPage() {
  const { data, refetch } = useList({ resource: "refunds" });
  const { mutate: update } = useUpdate();
  const { data: role } = usePermissions<string>();
  const isOwner = role === "owner";

  async function decide(id: string, decision: "approve" | "deny") {
    if (!isOwner) return;
    const ownerNote =
      decision === "deny"
        ? window.prompt("Denial reason (visible to guest)") || "Denied"
        : "Approved — processing refund";
    update(
      {
        resource: "refunds",
        id,
        values: {
          status: decision === "approve" ? "approved_processing" : "denied",
          ownerNote,
        },
      },
      { onSuccess: () => refetch() },
    );
    // Hit main site API when available
    const site = import.meta.env.VITE_SITE_URL || "http://localhost:3000";
    void fetch(`${site}/api/admin/refunds/decide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guestay-role": "owner",
      },
      body: JSON.stringify({ ticketId: id, decision, ownerNote }),
    });
  }

  return (
    <div>
      <h1>Refund Requests</h1>
      {!isOwner && (
        <p style={{ color: "#6b6b60" }}>
          Manager/Staff: read-only. Only Owner can approve or deny.
        </p>
      )}
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((t) => {
              const r = t as {
                id: string;
                guest: string;
                amountPkr: number;
                reason: string;
                status: string;
              };
              return (
                <tr key={r.id}>
                  <td>{r.guest}</td>
                  <td>Rs {r.amountPkr.toLocaleString()}</td>
                  <td>{r.reason}</td>
                  <td>{r.status}</td>
                  <td>
                    {isOwner && r.status === "pending" ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => decide(r.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => decide(r.id, "deny")}
                        >
                          Deny
                        </button>
                      </span>
                    ) : (
                      "—"
                    )}
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
