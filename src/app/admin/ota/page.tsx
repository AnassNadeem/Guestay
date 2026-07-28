"use client";

import { useState } from "react";

type FeedRow = {
  id: string;
  roomSlug: string;
  provider: "airbnb" | "booking_com";
  icalUrl: string;
  lastSyncedAt: string | null;
  lastSyncStatus: string;
  lastError?: string;
};

const seed: FeedRow[] = [
  {
    id: "1",
    roomSlug: "shared-bedroom-a",
    provider: "airbnb",
    icalUrl: "",
    lastSyncedAt: null,
    lastSyncStatus: "never",
  },
  {
    id: "2",
    roomSlug: "shared-bedroom-a",
    provider: "booking_com",
    icalUrl: "",
    lastSyncedAt: null,
    lastSyncStatus: "never",
  },
];

export default function AdminOtaPage() {
  const [feeds, setFeeds] = useState(seed);
  const [message, setMessage] = useState("");

  async function forceResync(id: string) {
    setMessage("Resyncing…");
    const res = await fetch("/api/admin/ota/resync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedId: id }),
    });
    const data = await res.json();
    setFeeds((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              lastSyncedAt: new Date().toISOString(),
              lastSyncStatus: data.ok ? "ok" : "error",
              lastError: data.error,
            }
          : f,
      ),
    );
    setMessage(data.ok ? "Sync finished (or queued)." : data.error || "Failed");
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-2xl text-ink">OTA sync monitor</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Paste Airbnb / Booking.com export URLs when ready. Our export iCal URLs
        are generated per room by the Worker. Standard iCal carries
        block/unblock only — no guest name or price.
      </p>
      {message && <p className="mt-3 text-sm text-olive">{message}</p>}
      <div className="mt-6 space-y-4">
        {feeds.map((f) => {
          const stale =
            f.lastSyncedAt &&
            Date.now() - new Date(f.lastSyncedAt).getTime() > 60 * 60 * 1000;
          return (
            <article
              key={f.id}
              className={`rounded-card border p-5 ${
                stale || f.lastSyncStatus === "error"
                  ? "border-destructive/40 bg-red-50"
                  : "border-olive/10 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium text-ink">
                  {f.roomSlug} · {f.provider}
                </h2>
                <button
                  type="button"
                  onClick={() => forceResync(f.id)}
                  className="rounded-soft bg-olive px-3 py-1.5 text-xs font-medium text-cream-50"
                >
                  Force resync
                </button>
              </div>
              <input
                className="mt-3 h-10 w-full rounded-soft border border-olive/15 px-3 text-sm"
                placeholder="iCal import URL"
                value={f.icalUrl}
                onChange={(e) =>
                  setFeeds((prev) =>
                    prev.map((row) =>
                      row.id === f.id
                        ? { ...row, icalUrl: e.target.value }
                        : row,
                    ),
                  )
                }
              />
              <p className="mt-2 text-xs text-ink-soft">
                Last sync: {f.lastSyncedAt || "never"} · {f.lastSyncStatus}
                {f.lastError ? ` · ${f.lastError}` : ""}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
