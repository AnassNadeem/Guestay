import { useList } from "@refinedev/core";
import { useMemo, useState } from "react";
import { CopyField } from "../components/CopyField";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "../components/icons";
import { SITE_URL, SOURCE_COLOR, SOURCE_LABEL } from "../lib/format";
import { usePageMeta } from "../hooks/usePageMeta";

const OCC_LEGEND = [
  { color: "#7d9b6a", label: "Mostly free (0-33%)" },
  { color: "#c4a35a", label: "Filling up (34-66%)" },
  { color: "#b45a4a", label: "Mostly full (67-100%)" },
];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function CalendarPage() {
  usePageMeta("Calendar", "Occupancy heatmap and booking timeline");
  const { data: bookings } = useList({ resource: "bookings" });
  const { data: rooms } = useList({ resource: "rooms" });
  const [view, setView] = useState<"heatmap" | "timeline">("heatmap");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const bookingRows = (bookings?.data || []) as Array<{
    id: string;
    reference: string;
    guest: string;
    room: string;
    source: string;
    status: string;
    checkIn: string;
    checkOut: string;
  }>;
  const roomRows = (rooms?.data || []) as Array<{ id: string; name: string }>;
  const totalRooms = Math.max(1, roomRows.length);

  const icalUrl = `${SITE_URL}/api/ical/export.ics`;

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: Array<{
      key: string;
      day: number | null;
      date: string;
      booked: number;
      free: number;
      color: string;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      list.push({ key: `pad-${i}`, day: null, date: "", booked: 0, free: 0, color: "transparent" });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = ymd(new Date(year, month, day));
      const booked = bookingRows.filter(
        (b) => b.status !== "cancelled" && b.checkIn <= date && b.checkOut > date,
      ).length;
      const free = Math.max(0, totalRooms - booked);
      const ratio = booked / totalRooms;
      const color =
        booked === 0
          ? "#e2e6d8"
          : ratio < 0.34
            ? "#7d9b6a"
            : ratio < 0.67
              ? "#c4a35a"
              : "#b45a4a";
      list.push({ key: date, day, date, booked, free, color });
    }
    return list;
  }, [cursor, bookingRows, totalRooms]);

  const selectedBookings = selectedDate
    ? bookingRows.filter(
        (b) => b.checkIn <= selectedDate && b.checkOut > selectedDate,
      )
    : [];

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
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

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 6px" }}>Subscribe to this calendar (iCal)</h3>
        <p style={{ color: "#6b6b60", fontSize: 13, marginTop: 0 }}>
          Copy this URL and paste it into Google Calendar / Apple Calendar → “Subscribe from URL”. It refreshes automatically.
        </p>
        <CopyField value={icalUrl} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="btn secondary icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeftIcon size={18} />
          </button>
          <strong style={{ minWidth: 160, textAlign: "center" }}>{monthLabel}</strong>
          <button type="button" className="btn secondary icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRightIcon size={18} />
          </button>
        </div>
        <div className="legend">
          {(view === "heatmap" ? OCC_LEGEND : Object.entries(SOURCE_COLOR).map(([k, c]) => ({ color: c, label: SOURCE_LABEL[k] || k }))).map(
            (l) => (
              <span key={l.label}>
                <span className="swatch" style={{ background: l.color }} />
                {l.label}
              </span>
            ),
          )}
        </div>
      </div>

      {view === "heatmap" ? (
        <div className="card">
          <div className="heatmap" style={{ marginBottom: 6 }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#9a9a8c", fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>
          <div className="heatmap">
            {cells.map((c) =>
              c.day === null ? (
                <div key={c.key} />
              ) : (
                <button
                  key={c.key}
                  type="button"
                  className="cell"
                  style={{ background: c.color, border: "none", cursor: "pointer" }}
                  title={`${c.date} · Booked ${c.booked} · Free ${c.free}`}
                  onClick={() => setSelectedDate(c.date)}
                >
                  {c.day}
                </button>
              ),
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <p style={{ color: "#6b6b60", fontSize: 14, marginTop: 0, marginBottom: 12 }}>
            Bars colored by source · click a bar for booking detail
          </p>
          {roomRows.map((r) => {
            const related = bookingRows.filter((b) => b.room === r.name && b.status !== "cancelled");
            return (
              <div key={r.id} className="timeline-row">
                <div style={{ fontSize: 13 }}>{r.name}</div>
                <div className="timeline-track">
                  {related.map((b, i) => (
                    <div
                      key={b.id}
                      className="timeline-bar"
                      style={{
                        left: `${8 + i * 26}%`,
                        width: "22%",
                        background: SOURCE_COLOR[b.source] || "#3B4430",
                      }}
                      title={`${b.reference} · ${b.guest} · ${SOURCE_LABEL[b.source] || b.source} · ${b.checkIn} → ${b.checkOut}`}
                      onClick={() => setSelectedDate(b.checkIn)}
                    >
                      {b.guest.split(" ")[0]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 style={{ margin: 0 }}>Bookings on {selectedDate}</h2>
              <button type="button" className="btn secondary icon-btn" onClick={() => setSelectedDate(null)} aria-label="Close">
                <XIcon size={18} />
              </button>
            </div>
            {selectedBookings.length === 0 ? (
              <p style={{ color: "#6b6b60" }}>No active bookings staying on this date.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Source</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.reference}</td>
                      <td>{b.guest}</td>
                      <td>{b.room}</td>
                      <td>{SOURCE_LABEL[b.source] || b.source}</td>
                      <td>{b.checkIn} → {b.checkOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
