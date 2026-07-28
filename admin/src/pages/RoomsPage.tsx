import { useList, useUpdate } from "@refinedev/core";
import { useState } from "react";

export function RoomsPage() {
  const { data, refetch } = useList({ resource: "rooms" });
  const { mutate: update } = useUpdate();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div>
      <h1>Rooms</h1>
      <p style={{ color: "#6b6b60" }}>
        Soft-delete deactivates a room. Hard-delete only when zero bookings reference it.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {(data?.data || []).map((room) => {
          const r = room as {
            id: string;
            name: string;
            type: string;
            status: string;
            capacity: number;
            tier1: number;
            tier2: number;
            tier3: number;
            tier4: number;
          };
          return (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0 }}>{r.name}</h2>
                  <p style={{ margin: "4px 0", color: "#6b6b60" }}>
                    {r.type} · sleeps {r.capacity} · {r.status}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setEditing(editing === r.id ? null : r.id)}
                  >
                    Edit tiers
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() =>
                      update(
                        {
                          resource: "rooms",
                          id: r.id,
                          values: { status: "archived" },
                        },
                        { onSuccess: () => refetch() },
                      )
                    }
                  >
                    Soft-delete
                  </button>
                </div>
              </div>
              {editing === r.id && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {(["tier1", "tier2", "tier3", "tier4"] as const).map((key, i) => (
                    <label key={key} style={{ fontSize: 13 }}>
                      Tier {i + 1}
                      <input
                        type="number"
                        defaultValue={r[key]}
                        onBlur={(e) =>
                          update({
                            resource: "rooms",
                            id: r.id,
                            values: { [key]: Number(e.target.value) },
                          })
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          marginTop: 4,
                          height: 36,
                          borderRadius: 8,
                          border: "1px solid #ccc",
                          padding: "0 8px",
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 13, marginTop: 10, color: "#6b6b60" }}>
                Photos: multi-upload + drag reorder + Set as thumbnail (Storage
                wired when Supabase credentials are present).
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
