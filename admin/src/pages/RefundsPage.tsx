import { useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { useMemo, useState } from "react";
import { useRole } from "../hooks/useRole";
import { usePageMeta } from "../hooks/usePageMeta";
import { adminAuthHeaders } from "../lib/adminAuthHeaders";
import { REFUND_STATUS, statusMeta, SITE_URL } from "../lib/format";
import { XIcon } from "../components/icons";

type Comment = { by: string; at: string; text: string };
type Refund = {
  id: string;
  bookingId?: string;
  guest: string;
  amountPkr: number;
  reason: string;
  status: string;
  ownerNote?: string;
  comments?: Comment[];
  createdAt?: string;
};

export function RefundsPage() {
  usePageMeta("Refunds", "Review and decide guest refund requests");
  const { data, refetch } = useList({ resource: "refunds" });
  const { data: auditData, refetch: refetchAudit } = useList({ resource: "audit_log" });
  const { mutate: update } = useUpdate();
  const { canDecideRefunds } = useRole();
  const { data: identity } = useGetIdentity<{ name?: string; email?: string }>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showArchive, setShowArchive] = useState(false);
  const [editTarget, setEditTarget] = useState<Refund | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function decide(refund: Refund, decision: "approve" | "deny") {
    if (!canDecideRefunds) return;
    const ownerNote =
      decision === "deny"
        ? window.prompt("Denial reason (visible to guest)") || "Denied"
        : "Approved - processing refund";
    update(
      {
        resource: "refunds",
        id: refund.id,
        values: {
          status: decision === "approve" ? "approved_processing" : "denied",
          ownerNote,
        },
      },
      { onSuccess: () => refetch() },
    );
    void (async () => {
      const headers = await adminAuthHeaders();
      await fetch(`${SITE_URL}/api/admin/refunds/decide`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ticketId: refund.id,
          decision,
          ownerNote,
          bookingId: refund.bookingId,
          amountPkr: refund.amountPkr,
        }),
      }).catch(() => {});
      void refetchAudit();
    })();
  }

  function addComment(refund: Refund) {
    const text = (drafts[refund.id] || "").trim();
    if (!text) return;
    const comment: Comment = {
      by: identity?.name || identity?.email || "Staff",
      at: new Date().toISOString(),
      text,
    };
    update(
      {
        resource: "refunds",
        id: refund.id,
        values: { comments: [...(refund.comments || []), comment] },
      },
      { onSuccess: () => refetch() },
    );
    setDrafts((d) => ({ ...d, [refund.id]: "" }));
  }

  const refunds = (data?.data || []) as Refund[];
  const pending = refunds.filter((r) => r.status === "pending");
  const archived = refunds.filter((r) => r.status !== "pending");
  const list = showArchive ? archived : pending;

  const logsByRefund = useMemo(() => {
    const map: Record<string, Array<{ at: string; action: string; detail: string; actor: string }>> = {};
    for (const e of (auditData?.data || []) as Array<{
      action: string;
      rowId?: string;
      entity?: string;
      detail: string;
      actor: string;
      at: string;
      tableName?: string;
    }>) {
      if (e.tableName && e.tableName !== "refund_requests") continue;
      if (!e.action.startsWith("refund_")) continue;
      const id = e.rowId || "";
      if (!id) continue;
      if (!map[id]) map[id] = [];
      map[id]!.push({
        at: e.at,
        action: e.action,
        detail: e.detail,
        actor: e.actor,
      });
    }
    return map;
  }, [auditData]);

  async function saveArchiveEdit() {
    if (!editTarget || !canDecideRefunds) return;
    setBusy(true);
    setError(null);
    try {
      const headers = await adminAuthHeaders();
      const res = await fetch(`${SITE_URL}/api/admin/refunds/update`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ticketId: editTarget.id,
          ownerNote: editNote,
          status: editStatus,
          changeNote: changeNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      setEditTarget(null);
      await refetch();
      await refetchAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Refund Requests</h1>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setShowArchive((v) => !v)}
        >
          {showArchive ? "New requests" : `Archive (${archived.length})`}
        </button>
      </div>
      <p style={{ color: "#6b6b60" }}>
        {showArchive
          ? "Decided requests. Edits are recorded in the audit log."
          : canDecideRefunds
            ? "Approve or deny pending requests. Decisions are recorded only; process payouts manually."
            : "You can add comments. Only an admin can approve or deny."}
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        {list.length === 0 && (
          <div className="card">
            <p style={{ margin: 0, color: "#9a9a8c" }}>
              {showArchive ? "No archived refunds yet." : "No new refund requests."}
            </p>
          </div>
        )}
        {list.map((r) => {
          const meta = statusMeta(REFUND_STATUS, r.status);
          const logs = logsByRefund[r.id] || [];
          return (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {r.guest} · Rs {r.amountPkr.toLocaleString()}
                  </h3>
                  <p style={{ margin: "4px 0", color: "#6b6b60" }}>
                    {r.bookingId ? `Booking ${r.bookingId} · ` : ""}
                    {r.reason}
                  </p>
                  <span className="badge" style={{ background: meta.bg, color: meta.fg }}>
                    {meta.label}
                  </span>
                  {r.ownerNote && (
                    <p style={{ marginTop: 8, fontSize: 13 }}>
                      <strong>Owner note:</strong> {r.ownerNote}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, height: "fit-content" }}>
                  {canDecideRefunds && r.status === "pending" && (
                    <>
                      <button type="button" className="btn" onClick={() => decide(r, "approve")}>
                        Approve
                      </button>
                      <button type="button" className="btn secondary" onClick={() => decide(r, "deny")}>
                        Deny
                      </button>
                    </>
                  )}
                  {canDecideRefunds && showArchive && (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        setEditTarget(r);
                        setEditNote(r.ownerNote || "");
                        setEditStatus(r.status);
                        setChangeNote("");
                        setError(null);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {showArchive && logs.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid rgba(59,68,48,0.1)", paddingTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Change log</div>
                  {logs.slice(0, 8).map((c, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>{c.actor}</strong>{" "}
                      <span className="muted">· {new Date(c.at).toLocaleString()}</span>
                      <div>
                        {c.action.replace(/_/g, " ")}
                        {c.detail ? ` - ${c.detail}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!showArchive && (
                <div style={{ marginTop: 12, borderTop: "1px solid rgba(59,68,48,0.1)", paddingTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Comments</div>
                  {(r.comments || []).length === 0 && (
                    <p style={{ color: "#9a9a8c", fontSize: 13, margin: 0 }}>No comments yet.</p>
                  )}
                  {(r.comments || []).map((c, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>{c.by}</strong>{" "}
                      <span className="muted">· {new Date(c.at).toLocaleString()}</span>
                      <div>{c.text}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input
                      value={drafts[r.id] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addComment(r)}
                      placeholder="Add a comment…"
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: "1px solid rgba(59,68,48,0.2)",
                        padding: "0 10px",
                      }}
                    />
                    <button type="button" className="btn secondary" onClick={() => addComment(r)}>
                      Comment
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Edit archived refund</h2>
              <button
                type="button"
                className="btn secondary icon-btn"
                onClick={() => setEditTarget(null)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            <label className="field">
              Status
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="approved_processing">Approved (Processing)</option>
                <option value="denied">Denied</option>
                <option value="pending">Pending (move back)</option>
              </select>
            </label>
            <label className="field">
              Owner note
              <textarea rows={3} value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </label>
            <label className="field">
              Change note (logged)
              <input
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Why is this being changed?"
              />
            </label>
            {error && <p style={{ color: "#B42318", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn secondary" onClick={() => setEditTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={saveArchiveEdit} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
