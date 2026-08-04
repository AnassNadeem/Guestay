import { useList } from "@refinedev/core";
import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useRole } from "../hooks/useRole";
import { usePageMeta } from "../hooks/usePageMeta";
import { useTablePager } from "../hooks/useTablePager";
import { TablePagination } from "../components/TablePagination";
import {
  DatePreset,
  inDateRange,
  rangeFromPreset,
} from "../lib/dateRange";
import { downloadBlob, exportPrintable, humanize } from "../lib/format";

type Entry = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
  at: string;
  tableName?: string;
};

export function AuditLogPage() {
  usePageMeta("Audit Log", "Owner activity trail for Guestay Admin");
  const { canSeeAudit, ready } = useRole();
  const { data, isLoading } = useList({ resource: "audit_log" });
  const [q, setQ] = useState("");
  const [preset, setPreset] = useState<DatePreset>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);

  const entries = (data?.data || []) as Entry[];

  const actionOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.action).filter(Boolean));
    return [...set].sort();
  }, [entries]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const range = rangeFromPreset(preset, customFrom, customTo);
    const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at));
    return sorted.filter((e) => {
      const matchQ =
        !query ||
        e.actor.toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query) ||
        e.entity.toLowerCase().includes(query) ||
        e.detail.toLowerCase().includes(query);
      const matchAction = actionFilter === "all" || e.action === actionFilter;
      const matchDate = !range || inDateRange(e.at, range.from, range.to);
      return matchQ && matchAction && matchDate;
    });
  }, [entries, q, preset, customFrom, customTo, actionFilter]);

  const pager = useTablePager(rows, 10);

  if (!ready) {
    return <p style={{ color: "#9a9a8c" }}>Loading…</p>;
  }
  if (!canSeeAudit) return <Navigate to="/" replace />;

  function exportCsv() {
    const header = "when,actor,action,entity,detail\n";
    const body = rows
      .map((e) =>
        [
          new Date(e.at).toISOString(),
          JSON.stringify(e.actor),
          JSON.stringify(e.action),
          JSON.stringify(e.entity),
          JSON.stringify(e.detail),
        ].join(","),
      )
      .join("\n");
    downloadBlob(header + body, "guestay-audit-log.csv", "text/csv");
    setExportOpen(false);
  }

  function exportPdf() {
    const tableHtml = `<table><thead><tr>
      <th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th>
      </tr></thead><tbody>${rows
        .map(
          (e) =>
            `<tr><td>${new Date(e.at).toLocaleString()}</td><td>${e.actor}</td><td>${humanize(
              e.action.replace(/\./g, " "),
            )}</td><td>${e.entity}</td><td>${e.detail}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    exportPrintable("Guestay Audit Log", tableHtml);
    setExportOpen(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Audit Log</h1>
        <div style={{ position: "relative" }}>
          <button type="button" className="btn secondary" onClick={() => setExportOpen((o) => !o)}>
            Export ▾
          </button>
          {exportOpen && (
            <div className="dropdown" style={{ top: 44, right: 0, width: 160, padding: "0.3rem" }}>
              <button type="button" className="dropdown-item" onClick={exportCsv}>
                Export CSV
              </button>
              <button type="button" className="dropdown-item" onClick={exportPdf}>
                Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
      <p style={{ color: "#6b6b60" }}>
        Owner-only activity trail for booking changes, refund decisions, and related writes.
      </p>

      <div className="card" style={{ marginTop: 8 }}>
        <div className="card-toolbar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actor, action, entity…"
            style={{ flex: 1, minWidth: 200, height: 36, borderRadius: 8, border: "1px solid rgba(59,68,48,0.2)", padding: "0 10px" }}
          />
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
              <option value="all">All time</option>
              <option value="custom">Custom</option>
            </select>
            {preset === "custom" && (
              <>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </>
            )}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Action"
            >
              <option value="all">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {humanize(a.replace(/\./g, " "))}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <p style={{ color: "#9a9a8c", padding: "1rem 0.5rem", margin: 0 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#9a9a8c", padding: "1rem 0.5rem", margin: 0 }}>
            No audit entries match the current filters.
          </p>
        ) : (
          <>
            <table className="table compact">
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
                {pager.pageRows.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.at).toLocaleString()}</td>
                    <td>{e.actor}</td>
                    <td>
                      <span className="badge" style={{ background: "#EAECE4", color: "#3B4430" }}>
                        {humanize(e.action.replace(/\./g, " "))}
                      </span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{e.entity}</td>
                    <td className="wrap" style={{ maxWidth: 360, fontSize: 13 }}>
                      {e.detail}
                    </td>
                  </tr>
                ))}
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
          </>
        )}
      </div>
    </div>
  );
}
