"use client";

import { useState } from "react";
import Link from "next/link";

export default function RequestQuotePage() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      roomType: String(fd.get("roomType") || ""),
      approxRoomsOrGuests: String(fd.get("approxRoomsOrGuests") || ""),
      approxMoveIn: String(fd.get("approxMoveIn") || ""),
      approxDuration: String(fd.get("approxDuration") || ""),
      notes: String(fd.get("notes") || ""),
    };
    try {
      const res = await fetch("/api/quotes/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setStatus("ok");
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-narrow pb-20">
        <p className="text-eyebrow text-olive">Long-term stays</p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Request a custom quote
        </h1>
        <p className="mt-3 text-ink-muted">
          Prefer a negotiated deposit + monthly rate? Tell us what you need —
          we&apos;ll reply by email. This does not charge a card and is separate
          from instant online checkout.
        </p>

        {status === "ok" && (
          <p className="mt-6 rounded-soft border border-olive/20 bg-olive/5 px-4 py-3 text-sm text-ink">
            Thanks — we received your request and will be in touch soon.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="text-ink-muted">Name</span>
            <input
              required
              name="name"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Email</span>
            <input
              required
              type="email"
              name="email"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Phone</span>
            <input
              required
              type="tel"
              name="phone"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Desired room type</span>
            <select
              name="roomType"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
              defaultValue=""
            >
              <option value="">Select…</option>
              <option value="shared_bedroom">Shared bedroom</option>
              <option value="private_room">Private room</option>
              <option value="flat">Flat / apartment</option>
              <option value="unsure">Not sure yet</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">
              Approximate rooms / guests
            </span>
            <input
              name="approxRoomsOrGuests"
              placeholder="e.g. 2 rooms or 3 guests"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Approximate move-in date</span>
            <input
              name="approxMoveIn"
              placeholder="e.g. mid-September"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Approximate duration</span>
            <input
              name="approxDuration"
              placeholder="e.g. 3–6 months"
              className="mt-1 h-11 w-full rounded-soft border border-olive/15 bg-white px-3 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Notes</span>
            <textarea
              name="notes"
              rows={4}
              className="mt-1 w-full rounded-soft border border-olive/15 bg-white px-3 py-2 text-sm"
            />
          </label>

          {error && (
            <p className="text-sm text-rose-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex h-11 items-center rounded-full bg-olive px-6 text-sm font-medium text-cream-50 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Submit quote request"}
          </button>
        </form>

        <p className="mt-8 text-sm text-ink-muted">
          Prefer instant booking at listed rates?{" "}
          <Link href="/rooms" className="text-olive underline">
            Browse rooms
          </Link>
        </p>
      </div>
    </div>
  );
}
