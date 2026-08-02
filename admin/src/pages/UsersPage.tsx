import { useList, useUpdate } from "@refinedev/core";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useRole } from "../hooks/useRole";
import { CopyField } from "../components/CopyField";
import { SITE_URL, humanize } from "../lib/format";
import { PlusIcon, XIcon } from "../components/icons";

type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  lastLogin: string;
};

export function UsersPage() {
  const { canManageStaff } = useRole();
  const { data, isError, error, refetch, isLoading } = useList({
    resource: "users",
  });
  const { mutate: update } = useUpdate();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!canManageStaff) return <Navigate to="/" replace />;

  function addUser() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setActionError(null);
    const token = Math.random().toString(36).slice(2, 10);
    const link = `${SITE_URL}/admin/invite?token=${token}&email=${encodeURIComponent(trimmed)}&role=${encodeURIComponent(role)}`;
    // Link-only invite for now (no auth.admin from browser anon key).
    setMagicLink(link);
    setEmail("");
  }

  const users = (data?.data || []) as User[];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Staff / Users</h1>
        <button
          type="button"
          className="btn"
          style={{ gap: 6 }}
          onClick={() => {
            setMagicLink(null);
            setActionError(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon size={16} /> Add User
        </button>
      </div>
      <p style={{ color: "#6b6b60" }}>
        Invited users receive a magic link. On first login they set up their profile — including
        date of birth and phone (both start unverified).
      </p>

      {isError && (
        <div
          className="card"
          style={{ marginTop: 8, borderColor: "#FBE4E4", background: "#FDF2F2" }}
        >
          <p style={{ margin: 0, color: "#B42318" }}>
            Could not load staff:{" "}
            {(error as { message?: string } | null)?.message || "Unknown error"}
          </p>
          <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        {isLoading ? (
          <p style={{ color: "#9a9a8c", margin: 0 }}>Loading staff…</p>
        ) : users.length === 0 && !isError ? (
          <p style={{ color: "#9a9a8c", margin: 0 }}>No staff users yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{humanize(r.role)}</td>
                  <td>{humanize(r.status)}</td>
                  <td>{r.lastLogin || "—"}</td>
                  <td>
                    {r.role !== "owner" ? (
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() =>
                          update(
                            {
                              resource: "users",
                              id: r.id,
                              values: {
                                status: r.status === "suspended" ? "active" : "suspended",
                              },
                            },
                            {
                              onSuccess: () => refetch(),
                              onError: (err) =>
                                setActionError(err?.message || "Update failed"),
                            },
                          )
                        }
                      >
                        {r.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {actionError && (
          <p style={{ color: "#B42318", marginTop: 8 }}>{actionError}</p>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Add User</h2>
              <button type="button" className="btn secondary icon-btn" onClick={() => setModalOpen(false)} aria-label="Close">
                <XIcon size={18} />
              </button>
            </div>

            {!magicLink ? (
              <>
                <label className="field">
                  Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </label>
                <label className="field">
                  Role
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </label>
                {actionError && (
                  <p style={{ color: "#B42318", fontSize: 13 }}>{actionError}</p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn" onClick={addUser} disabled={!email.trim()}>
                    Send invite
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14 }}>
                  Invite created. Share this magic link with the user (no temporary password needed):
                </p>
                <CopyField value={magicLink} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
