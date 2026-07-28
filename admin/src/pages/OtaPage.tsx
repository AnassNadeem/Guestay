import { useList } from "@refinedev/core";

export function OtaPage() {
  const { data, refetch } = useList({ resource: "ota" });

  async function forceResync(id: string) {
    const site = import.meta.env.VITE_SITE_URL || "http://localhost:3000";
    await fetch(`${site}/api/admin/ota/resync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedId: id }),
    });
    refetch();
  }

  return (
    <div>
      <h1>OTA Sync</h1>
      <p style={{ color: "#6b6b60" }}>
        Import cron every 15 minutes · Export live .ics per room
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Provider</th>
              <th>Last sync</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((f) => {
              const r = f as {
                id: string;
                room: string;
                provider: string;
                lastSyncedAt: string;
                status: string;
              };
              return (
                <tr key={r.id}>
                  <td>{r.room}</td>
                  <td>{r.provider}</td>
                  <td>{new Date(r.lastSyncedAt).toLocaleString()}</td>
                  <td style={{ color: r.status === "stale" ? "#b42318" : "#3B4430" }}>
                    {r.status}
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
      </div>
    </div>
  );
}
