import { useList } from "@refinedev/core";
import { CopyField } from "../components/CopyField";
import { adminAuthHeaders } from "../lib/adminAuthHeaders";
import { SITE_URL, SOURCE_LABEL } from "../lib/format";

const IMPORT_TIP =
  "Import runs automatically every 15 minutes, pulling reservations from the OTA's iCal feed so your calendar stays blocked.";
const EXPORT_TIP =
  "Copy this room's export URL and paste it into the OTA's calendar settings (Import/Sync calendar) so they block dates you've booked here.";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function OtaPage() {
  const { data, refetch } = useList({ resource: "ota" });

  async function forceResync(id: string) {
    await fetch(`${SITE_URL}/api/admin/ota/resync`, {
      method: "POST",
      headers: await adminAuthHeaders(),
      body: JSON.stringify({ feedId: id }),
    }).catch(() => {});
    refetch();
  }

  const rows = (data?.data || []) as Array<{
    id: string;
    room: string;
    roomSlug?: string;
    provider: string;
    lastSyncedAt: string;
    status: string;
  }>;

  return (
    <div>
      <h1>OTA Sync</h1>
      <p style={{ color: "#6b6b60" }}>
        Import
        <span className="tip" title={IMPORT_TIP}>?</span>
        every 15 minutes · Export
        <span className="tip" title={EXPORT_TIP}>?</span>
        live .ics per room
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        {rows.length === 0 ? (
          <div style={{ padding: "1.5rem 0.5rem" }}>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--olive)" }}>
              OTA sync not yet connected
            </p>
            <p style={{ margin: "8px 0 0", color: "#6b6b60", fontSize: 14 }}>
              Channel feeds (Airbnb / Booking.com) are not configured. Full OTA
              sync is still deferred — this page will list real feeds from{" "}
              <code>ota_feeds</code> once they exist. No placeholder data is shown.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Provider</th>
                <th>Last sync</th>
                <th>Status</th>
                <th>Export URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const slug = r.roomSlug || slugify(r.room);
                const exportUrl = `${SITE_URL}/api/ical/${slug}.ics`;
                return (
                  <tr key={r.id}>
                    <td>{r.room}</td>
                    <td>{SOURCE_LABEL[r.provider] || r.provider}</td>
                    <td>
                      {r.lastSyncedAt
                        ? new Date(r.lastSyncedAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={
                          r.status === "ok"
                            ? { background: "#E4F3E8", color: "#1E6B3A" }
                            : { background: "#FBE4E4", color: "#B42318" }
                        }
                      >
                        {r.status === "ok" ? "Up to date" : "Stale"}
                      </span>
                    </td>
                    <td style={{ minWidth: 260 }}>
                      <CopyField value={exportUrl} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => forceResync(r.id)}
                      >
                        Force Resync
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
