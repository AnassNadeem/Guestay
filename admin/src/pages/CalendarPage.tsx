import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";

const SOURCE_COLOR: Record<string, string> = {
  direct: "#3B4430",
  airbnb: "#FF5A5F",
  booking_com: "#003580",
  walk_in: "#A6AC7E",
};

export function CalendarPage() {
  const { data: bookings } = useList({ resource: "bookings" });
  const { data: rooms } = useList({ resource: "rooms" });
  const [view, setView] = useState<"heatmap" | "timeline">("heatmap");

  const monthCells = useMemo(() => {
    const days = Array.from({ length: 35 }, (_, i) => {
      const free = Math.floor(Math.random() * 5);
      const booked = 5 - free;
      const ratio = booked / 5;
      const color =
        ratio < 0.34 ? "#7d9b6a" : ratio < 0.67 ? "#c4a35a" : "#b45a4a";
      return { day: i + 1, free, booked, color };
    });
    return days;
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Calendars</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={view === "heatmap" ? "btn" : "btn secondary"}
            onClick={() => setView("heatmap")}
          >
            Property overview
          </button>
          <button
            type="button"
            className={view === "timeline" ? "btn" : "btn secondary"}
            onClick={() => setView("timeline")}
          >
            Per-room timeline
          </button>
        </div>
      </div>

      {view === "heatmap" ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ color: "#6b6b60", fontSize: 14 }}>
            Month grid — green mostly free → red mostly full
          </p>
          <div className="heatmap" style={{ marginTop: 12 }}>
            {monthCells.map((c) => (
              <div
                key={c.day}
                className="cell"
                style={{ background: c.color }}
                title={`Free ${c.free} · Booked ${c.booked}`}
              >
                {c.day <= 31 ? c.day : ""}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ color: "#6b6b60", fontSize: 14, marginBottom: 12 }}>
            Bars colored by source · drag to extend/move (UI shell; persist via
            bookings API)
          </p>
          {(rooms?.data || []).map((room) => {
            const r = room as { id: string; name: string };
            const related = (bookings?.data || []).filter(
              (b) => (b as { room: string }).room === r.name,
            );
            return (
              <div key={r.id} className="timeline-row">
                <div style={{ fontSize: 13 }}>{r.name}</div>
                <div className="timeline-track">
                  {related.map((b, i) => {
                    const row = b as { source: string; guest: string };
                    return (
                      <div
                        key={i}
                        className="timeline-bar"
                        style={{
                          left: `${10 + i * 28}%`,
                          width: "24%",
                          background: SOURCE_COLOR[row.source] || "#3B4430",
                        }}
                        title={row.guest}
                      >
                        {row.guest.split(" ")[0]}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 12, marginTop: 16, fontSize: 12 }}>
            {Object.entries(SOURCE_COLOR).map(([k, c]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: c,
                  }}
                />
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
