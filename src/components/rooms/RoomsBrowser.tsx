"use client";

import { RoomCard } from "@/components/rooms/RoomCard";
import type { Room } from "@/types";
import { useMemo, useState } from "react";

const types: Array<{ value: Room["type"] | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "private", label: "Private" },
  { value: "shared", label: "Shared" },
  { value: "studio", label: "Studio" },
  { value: "suite", label: "Suite" },
];

const availability: Array<{
  value: Room["availability"] | "all";
  label: string;
}> = [
  { value: "all", label: "Any status" },
  { value: "available", label: "Available" },
  { value: "limited", label: "Limited" },
  { value: "waitlist", label: "Waitlist" },
];

export function RoomsBrowser({ rooms }: { rooms: Room[] }) {
  const [type, setType] = useState<Room["type"] | "all">("all");
  const [status, setStatus] = useState<Room["availability"] | "all">("all");

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (status !== "all" && r.availability !== status) return false;
      return true;
    });
  }, [rooms, type, status]);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-card border border-olive/8 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Room type">
          {types.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors ${
                type === t.value
                  ? "bg-olive text-cream-50"
                  : "bg-cream-100 text-ink-muted hover:bg-cream-200 hover:text-olive"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="sr-only sm:not-sr-only">Availability</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as Room["availability"] | "all")
            }
            className="rounded-soft border border-olive/10 bg-cream-50 px-3 py-2 text-sm text-ink outline-none focus:border-olive/30"
          >
            {availability.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        Showing {filtered.length} of {rooms.length} rooms
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-card bg-cream-100 px-6 py-12 text-center text-ink-muted">
          No rooms match these filters. Try clearing availability or choosing All.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room, i) => (
            <RoomCard key={room.id} room={room} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
