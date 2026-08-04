import { useDelete, useList, useUpdate } from "@refinedev/core";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { usePageMeta } from "../hooks/usePageMeta";

type Notif = {
  id: string;
  kind: string;
  title: string;
  message: string;
  href?: string | null;
  unread: boolean;
  at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationsPage() {
  usePageMeta("Notifications", "Admin notifications inbox");
  const { data, refetch, isLoading, isError, error } = useList({
    resource: "notifications",
  });
  const { mutate: update } = useUpdate();
  const { mutate: remove } = useDelete();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const rows = useMemo(() => {
    const list = (data?.data || []) as Notif[];
    const sorted = [...list].sort((a, b) => b.at.localeCompare(a.at));
    if (filter === "unread") return sorted.filter((n) => n.unread);
    return sorted;
  }, [data, filter]);

  function markRead(n: Notif) {
    if (!n.unread) return;
    update(
      { resource: "notifications", id: n.id, values: { isRead: true } },
      { onSuccess: () => refetch() },
    );
  }

  function markAllRead() {
    rows
      .filter((n) => n.unread)
      .forEach((n) =>
        update(
          { resource: "notifications", id: n.id, values: { isRead: true } },
          { onSuccess: () => refetch() },
        ),
      );
  }

  function deleteOne(id: string) {
    remove(
      { resource: "notifications", id },
      { onSuccess: () => refetch() },
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1>Notifications</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={`btn secondary ${filter === "all" ? "" : ""}`}
            onClick={() => setFilter("all")}
            style={filter === "all" ? { borderColor: "var(--olive)" } : undefined}
          >
            All
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setFilter("unread")}
            style={filter === "unread" ? { borderColor: "var(--olive)" } : undefined}
          >
            Unread
          </button>
          <button type="button" className="btn secondary" onClick={markAllRead}>
            Mark all read
          </button>
        </div>
      </div>
      <p style={{ color: "#6b6b60" }}>
        Booking events, refund requests, payment issues, and OTA sync alerts.
      </p>

      {isError && (
        <div className="card" style={{ borderColor: "#FBE4E4", background: "#FDF2F2" }}>
          <p style={{ margin: 0, color: "#B42318" }}>
            {(error as { message?: string } | null)?.message ||
              "Could not load notifications"}
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        {isLoading ? (
          <p style={{ color: "#9a9a8c", margin: 0 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#9a9a8c", margin: 0 }}>
            {filter === "unread" ? "No unread notifications." : "No notifications yet."}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((n) => (
              <li
                key={n.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 8px",
                  borderBottom: "1px solid rgba(59,68,48,0.08)",
                  background: n.unread ? "rgba(166,172,126,0.12)" : "transparent",
                  borderRadius: 8,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    marginTop: 6,
                    borderRadius: "50%",
                    background: n.unread ? "var(--olive)" : "transparent",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                    }}
                  >
                    <div style={{ fontWeight: n.unread ? 600 : 500, color: "var(--ink)" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b6b60", marginTop: 2 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a9a8c", marginTop: 4 }}>
                      {timeAgo(n.at)} · {n.kind.replace(/_/g, " ")}
                    </div>
                  </button>
                  {n.href && (
                    <Link
                      to={n.href}
                      onClick={() => markRead(n)}
                      style={{ fontSize: 13, color: "var(--olive)", marginTop: 4, display: "inline-block" }}
                    >
                      Open →
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ height: 32 }}
                  onClick={() => deleteOne(n.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
