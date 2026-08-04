import { Navigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useRole } from "../hooks/useRole";
import { usePageMeta } from "../hooks/usePageMeta";
import { adminAuthHeaders } from "../lib/adminAuthHeaders";
import { SITE_URL, humanize } from "../lib/format";
import {
  PlusIcon,
  XIcon,
  PencilIcon,
  TrashIcon,
  EyeViewIcon,
  UserCheckIcon,
  UserXIcon,
} from "../components/icons";
import { supabase } from "../supabase";

type StaffUser = {
  id: string;
  email: string;
  name?: string;
  phone?: string | null;
  role: string;
  status: string;
  lastLogin: string;
  lastLoginRaw?: string | null;
  createdAt?: string;
};

type ModalMode = "add" | "edit" | "view" | "delete" | null;

function roleLabel(role: string) {
  if (role === "owner") return "Admin";
  if (role === "manager") return "Manager";
  return humanize(role);
}

function statusBadge(status: string) {
  const active = status === "active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: active ? "#E4F3E8" : "#FBE4E4",
        color: active ? "#1E6B3A" : "#B42318",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const emptyForm = {
  email: "",
  fullName: "",
  phone: "",
  role: "manager",
  status: "active",
};

export function UsersPage() {
  usePageMeta("Users", "Manage Guestay Admin and Manager accounts");
  const { canManageStaff, ready } = useRole();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      if (!supabase) throw new Error("Supabase is not configured");
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, full_name, phone, role, created_at, last_login_at, is_suspended",
        )
        .in("role", ["owner", "manager"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(
        (data || []).map((p) => ({
          id: p.id,
          email: p.email,
          name: p.full_name || p.email,
          phone: p.phone,
          role: p.role,
          status: p.is_suspended ? "inactive" : "active",
          lastLogin: p.last_login_at
            ? new Date(p.last_login_at as string).toLocaleString()
            : "-",
          lastLoginRaw: p.last_login_at as string | null,
          createdAt: p.created_at as string,
        })),
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && canManageStaff) void loadUsers();
  }, [loadUsers, ready, canManageStaff]);

  if (!ready) {
    return <p style={{ color: "#9a9a8c" }}>Loading…</p>;
  }
  if (!canManageStaff) return <Navigate to="/" replace />;

  function openAdd() {
    setSelected(null);
    setForm(emptyForm);
    setActionError(null);
    setActionOk(null);
    setModal("add");
  }

  function openView(u: StaffUser) {
    setSelected(u);
    setActionError(null);
    setModal("view");
  }

  function openEdit(u: StaffUser) {
    setSelected(u);
    setForm({
      email: u.email,
      fullName: u.name && u.name !== u.email ? u.name : "",
      phone: u.phone || "",
      role: u.role === "owner" ? "admin" : "manager",
      status: u.status === "active" ? "active" : "inactive",
    });
    setActionError(null);
    setActionOk(null);
    setModal("edit");
  }

  function openDelete(u: StaffUser) {
    setSelected(u);
    setActionError(null);
    setModal("delete");
  }

  async function inviteUser() {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setActionError("Email is required");
      return;
    }
    setBusy(true);
    setActionError(null);
    setActionOk(null);
    try {
      const res = await fetch(`${SITE_URL}/api/admin/staff`, {
        method: "POST",
        headers: await adminAuthHeaders(),
        body: JSON.stringify({
          email,
          role: form.role,
          fullName: form.fullName.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
        ok?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setActionOk(
        data.warning ||
          "Invite sent. The user will receive an email to set their password.",
      );
      setModal(null);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`${SITE_URL}/api/admin/staff/${selected.id}`, {
        method: "PATCH",
        headers: await adminAuthHeaders(),
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          fullName: form.fullName.trim() || null,
          phone: form.phone.trim() || null,
          role: form.role,
          status: form.status === "active" ? "active" : "inactive",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      setActionOk("User updated");
      setModal(null);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: StaffUser) {
    setBusy(true);
    setActionError(null);
    try {
      const next = u.status === "active" ? "inactive" : "active";
      const res = await fetch(`${SITE_URL}/api/admin/staff/${u.id}`, {
        method: "PATCH",
        headers: await adminAuthHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Status update failed");
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`${SITE_URL}/api/admin/staff/${selected.id}`, {
        method: "DELETE",
        headers: await adminAuthHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setActionOk("User deleted");
      setModal(null);
      await loadUsers();
    } catch (err) {
      const msg =
        err instanceof TypeError
          ? `Could not reach the API (${SITE_URL}). Check that the site is deployed and VITE_SITE_URL is set.`
          : err instanceof Error
            ? err.message
            : "Delete failed";
      setActionError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Users</h1>
        <button type="button" className="btn" style={{ gap: 6 }} onClick={openAdd}>
          <PlusIcon size={16} /> Add User
        </button>
      </div>
      <p style={{ color: "#6b6b60" }}>
        Admins have full access. Managers have limited access. New users receive an email to set their password.
      </p>

      {loadError && (
        <div
          className="card"
          style={{ marginTop: 8, borderColor: "#FBE4E4", background: "#FDF2F2" }}
        >
          <p style={{ margin: 0, color: "#B42318" }}>Could not load users: {loadError}</p>
          <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={() => loadUsers()}>
            Retry
          </button>
        </div>
      )}

      {actionOk && <p style={{ color: "#1E6B3A", marginTop: 8 }}>{actionOk}</p>}
      {actionError && !modal && (
        <p style={{ color: "#B42318", marginTop: 8 }}>{actionError}</p>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        {isLoading ? (
          <p style={{ color: "#9a9a8c", margin: 0 }}>Loading users…</p>
        ) : users.length === 0 && !loadError ? (
          <p style={{ color: "#9a9a8c", margin: 0 }}>No users yet.</p>
        ) : (
          <table className="table compact">
            <thead>
              <tr>
                <th>Name</th>
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
                  <td>{r.name || "-"}</td>
                  <td>{r.email}</td>
                  <td>{roleLabel(r.role)}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td>{r.lastLogin || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn secondary icon-btn"
                        title="View"
                        aria-label="View"
                        onClick={() => openView(r)}
                      >
                        <EyeViewIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn secondary icon-btn"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => openEdit(r)}
                      >
                        <PencilIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn secondary icon-btn"
                        title={r.status === "active" ? "Deactivate" : "Activate"}
                        aria-label={r.status === "active" ? "Deactivate" : "Activate"}
                        disabled={busy}
                        onClick={() => toggleActive(r)}
                      >
                        {r.status === "active" ? (
                          <UserXIcon size={15} />
                        ) : (
                          <UserCheckIcon size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn secondary icon-btn"
                        title="Delete"
                        aria-label="Delete"
                        style={{ color: "#B42318", borderColor: "rgba(180,35,24,0.25)" }}
                        onClick={() => openDelete(r)}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === "add" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Add User</h2>
              <button type="button" className="btn secondary icon-btn" onClick={() => setModal(null)} aria-label="Close">
                <XIcon size={18} />
              </button>
            </div>
            <label className="field">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
                autoComplete="off"
              />
            </label>
            <label className="field">
              Full name (optional)
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Full name"
              />
            </label>
            <label className="field">
              Phone (optional)
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+92…"
              />
            </label>
            <label className="field">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="manager">Manager (limited access)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </label>
            {actionError && <p style={{ color: "#B42318", fontSize: 13 }}>{actionError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={inviteUser} disabled={busy || !form.email.trim()}>
                {busy ? "Sending…" : "Send invite email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "edit" && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Edit User</h2>
              <button type="button" className="btn secondary icon-btn" onClick={() => setModal(null)} aria-label="Close">
                <XIcon size={18} />
              </button>
            </div>
            <label className="field">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="field">
              Full name
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </label>
            <label className="field">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="field">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="field">
              Status
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {actionError && <p style={{ color: "#B42318", fontSize: 13 }}>{actionError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={saveEdit} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "view" && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>User details</h2>
              <button type="button" className="btn secondary icon-btn" onClick={() => setModal(null)} aria-label="Close">
                <XIcon size={18} />
              </button>
            </div>
            <dl style={{ margin: 0, display: "grid", gap: 10, fontSize: 14 }}>
              <div>
                <dt className="muted">Name</dt>
                <dd style={{ margin: "2px 0 0" }}>{selected.name || "-"}</dd>
              </div>
              <div>
                <dt className="muted">Email</dt>
                <dd style={{ margin: "2px 0 0" }}>{selected.email}</dd>
              </div>
              <div>
                <dt className="muted">Phone</dt>
                <dd style={{ margin: "2px 0 0" }}>{selected.phone || "-"}</dd>
              </div>
              <div>
                <dt className="muted">Role</dt>
                <dd style={{ margin: "2px 0 0" }}>{roleLabel(selected.role)}</dd>
              </div>
              <div>
                <dt className="muted">Status</dt>
                <dd style={{ margin: "2px 0 0" }}>{statusBadge(selected.status)}</dd>
              </div>
              <div>
                <dt className="muted">Last login</dt>
                <dd style={{ margin: "2px 0 0" }}>{selected.lastLogin || "-"}</dd>
              </div>
              <div>
                <dt className="muted">Created</dt>
                <dd style={{ margin: "2px 0 0" }}>
                  {selected.createdAt
                    ? new Date(selected.createdAt).toLocaleString()
                    : "-"}
                </dd>
              </div>
            </dl>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="btn secondary" onClick={() => openEdit(selected)}>
                Edit
              </button>
              <button type="button" className="btn" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "delete" && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Delete user?</h2>
              <button type="button" className="btn secondary icon-btn" onClick={() => setModal(null)} aria-label="Close">
                <XIcon size={18} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#6b6b60", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete{" "}
              <strong>{selected.email}</strong>? This cannot be undone.
            </p>
            {actionError && <p style={{ color: "#B42318", fontSize: 13 }}>{actionError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="btn secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "#B42318" }}
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
