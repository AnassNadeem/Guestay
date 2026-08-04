const PROD_SITE = "https://guestay.pk";

/**
 * Public site origin for admin → guestay.pk API calls.
 * Vite bakes this at build time; production builds must never fall back to localhost.
 */
export const SITE_URL = (() => {
  const fromEnv =
    (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ||
    (import.meta.env.NEXT_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (fromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.PROD) return PROD_SITE;
  return fromEnv?.replace(/\/$/, "") || "http://localhost:3000";
})();

export const SOURCE_LABEL: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  walk_in: "Walk-in",
};

export const SOURCE_COLOR: Record<string, string> = {
  booking_com: "#003580",
  airbnb: "#FF5A5F",
  direct: "#A6AC7E",
  walk_in: "#6B6B60",
};

type StatusMeta = { label: string; bg: string; fg: string };

export const BOOKING_STATUS: Record<string, StatusMeta> = {
  pending_hold: { label: "Awaiting Payment", bg: "#FDF0D5", fg: "#8A6D0B" },
  awaiting_payment: { label: "Awaiting Payment", bg: "#FDF0D5", fg: "#8A6D0B" },
  hold: { label: "On Hold", bg: "#FDF0D5", fg: "#8A6D0B" },
  partially_paid: { label: "Partially Paid", bg: "#E3F0FB", fg: "#0B5A8A" },
  paid: { label: "Paid", bg: "#E4F3E8", fg: "#1E6B3A" },
  confirmed_no_advance: { label: "Confirmed (No Advance)", bg: "#EDEBF7", fg: "#4B3B8A" },
  cancelled: { label: "Cancelled", bg: "#FBE4E4", fg: "#B42318" },
  completed: { label: "Completed", bg: "#EAECE4", fg: "#3B4430" },
};

export const REFUND_STATUS: Record<string, StatusMeta> = {
  pending: { label: "Pending Review", bg: "#FDF0D5", fg: "#8A6D0B" },
  approved_processing: { label: "Approved (Processing)", bg: "#E4F3E8", fg: "#1E6B3A" },
  denied: { label: "Denied", bg: "#FBE4E4", fg: "#B42318" },
};

export function statusMeta(map: Record<string, StatusMeta>, status: string): StatusMeta {
  return map[status] || { label: humanize(status), bg: "#EAECE4", fg: "#3B4430" };
}

export function humanize(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

export function nights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export a printable HTML document as a PDF. Uses jsPDF when available,
 * otherwise opens a print-ready window (user picks "Save as PDF").
 */
export function exportPrintable(title: string, tableHtml: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;color:#231f1a;padding:32px}
    h1{font-family:'Space Grotesk',system-ui,sans-serif;color:#3b4430}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
    th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #ddd}
    th{background:#eaece4}
    .meta{color:#6b6b60;font-size:12px}
  </style></head><body>
  <h1>${title}</h1>
  <p class="meta">Generated ${new Date().toLocaleString()} · Guestay Admin</p>
  ${tableHtml}
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    downloadBlob(html, `${title.replace(/\s+/g, "-").toLowerCase()}.html`, "text/html");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
