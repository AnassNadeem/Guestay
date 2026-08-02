"use client";

/**
 * Legacy Next admin OTA page — honest empty state (no fake seed rows).
 * Primary UI lives in the Vite admin app at /ota.
 */
export default function AdminOtaPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-2xl text-ink">OTA sync monitor</h1>
      <p className="mt-2 text-sm text-ink-muted">
        OTA sync is not yet connected. Full channel sync (Airbnb / Booking.com
        iCal import) is still deferred. No placeholder feeds are shown.
      </p>
      <p className="mt-6 rounded-card border border-olive/15 bg-white/80 p-5 text-sm text-ink-muted">
        Use the admin app’s <strong>OTA Sync</strong> page once feeds exist in{" "}
        <code>ota_feeds</code>.
      </p>
    </div>
  );
}
