import { useList } from "@refinedev/core";
import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useRole } from "../hooks/useRole";
import { humanize } from "../lib/format";

type Entry = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
  at: string;
};

export function AuditLogPage() {
  const { canSeeAudit } = useRole();
  const { data, isLoading } = useList({ resource: "audit_log" });
  const [q, setQ] = useState("");

  const entries = (data?.data || []) as Entry[];
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at));
    if (!query) return sorted;
    return sorted.filter(
      (e) =>
        e.actor.toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query) ||
        e.entity.toLowerCase().includes(query) ||
        e.detail.toLowerCase().includes(query),
    );
  }, [entries, q]);

  if (!canSeeAudit) return <Navigate to="/" replace />;

  return (
    <div>
      <h1>Audit Log</h1>
      <p style={{ color: "#6b6b60" }}>
        Owner-only activity trail from Supabase{" "}
        <code style={{ margin: "0 4px" }}>audit_log</code>
        — booking changes, refund decisions, and related writes.
      </p>

      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search actor, action, entity…"
          style={{ flex: 1, minWidth: 220 }}
        />
      </div>

      <div className="card">
        {isLoading ? (
          <p style={{ color: "#9a9a8c", padding: "1rem 0.5rem", margin: 0 }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#9a9a8c", padding: "1rem 0.5rem", margin: 0 }}>
            No audit entries yet. Refund approvals/denials and booking
            inserts/updates/deletes will appear here.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(e.at).toLocaleString()}
                  </td>
                  <td>{e.actor}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ background: "#EAECE4", color: "#3B4430" }}
                    >
                      {humanize(e.action.replace(/\./g, " "))}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {e.entity}
                  </td>
                  <td style={{ maxWidth: 360, fontSize: 13 }}>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
