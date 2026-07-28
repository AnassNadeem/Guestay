import Link from "next/link";

export default function AdminAuditPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Audit log (Owner)</h1>
        <Link href="/admin" className="text-sm text-olive">
          ← Bookings
        </Link>
      </div>
      <p className="rounded-card border border-olive/10 bg-white p-6 text-sm text-ink-muted">
        Append-only <code className="font-mono text-ink">audit_log</code> is
        written by a Postgres trigger on <code className="font-mono">bookings</code>
        (see <code className="font-mono">supabase/migrations</code>). Manager
        accounts cannot read this table (RLS). Once Supabase is connected, this
        page will list before/after diffs such as date changes and deletions.
      </p>
    </div>
  );
}
