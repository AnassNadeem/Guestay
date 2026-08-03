import { useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { useState } from "react";
import { useRole } from "../hooks/useRole";
import { adminAuthHeaders } from "../lib/adminAuthHeaders";
import { REFUND_STATUS, statusMeta, SITE_URL } from "../lib/format";

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
};

export function RefundsPage() {
  const { data, refetch } = useList({ resource: "refunds" });
  const { mutate: update } = useUpdate();
  const { canDecideRefunds } = useRole();
  const { data: identity } = useGetIdentity<{ name?: string; email?: string }>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function decide(id: string, decision: "approve" | "deny") {
    if (!canDecideRefunds) return;
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
    // Decision endpoint is intentionally NOT a Safepay call — refunds are
    // processed manually/offline. The API only records the decision.
    void (async () => {
      const headers = await adminAuthHeaders();
      await fetch(`${SITE_URL}/api/admin/refunds/decide`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ticketId: id, decision, ownerNote }),
      }).catch(() => {});
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

  return (
    <div>
      <h1>Refund Requests</h1>
      <p style={{ color: "#6b6b60" }}>
        {canDecideRefunds
          ? "Approving records the decision only — no automatic Safepay payout is triggered. Process the refund manually."
          : "Manager/Staff: you can add comments, but only the Owner can approve or deny."}
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
        {refunds.map((r) => {
          const meta = statusMeta(REFUND_STATUS, r.status);
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
                {canDecideRefunds && r.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, height: "fit-content" }}>
                    <button type="button" className="btn" onClick={() => decide(r.id, "approve")}>
                      Approve
                    </button>
                    <button type="button" className="btn secondary" onClick={() => decide(r.id, "deny")}>
                      Deny
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 12, borderTop: "1px solid rgba(59,68,48,0.1)", paddingTop: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Comments</div>
                {(r.comments || []).length === 0 && (
                  <p style={{ color: "#9a9a8c", fontSize: 13, margin: 0 }}>No comments yet.</p>
                )}
                {(r.comments || []).map((c, i) => (
                  <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                    <strong>{c.by}</strong> <span className="muted">· {new Date(c.at).toLocaleString()}</span>
                    <div>{c.text}</div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input
                    value={drafts[r.id] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addComment(r)}
                    placeholder="Add a comment…"
                    style={{ flex: 1, height: 38, borderRadius: 8, border: "1px solid rgba(59,68,48,0.2)", padding: "0 10px" }}
                  />
                  <button type="button" className="btn secondary" onClick={() => addComment(r)}>
                    Comment
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
