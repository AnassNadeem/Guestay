/**
 * Soft-retire Next.js /admin — staff UI lives on Refine at admin.guestay.pk.
 */
export default function AdminRetiredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Staff admin moved
      </h1>
      <p className="mt-3 max-w-md text-ink-muted">
        The Guestay staff app now runs on Refine at{" "}
        <strong className="text-ink">admin.guestay.pk</strong>.
      </p>
      <a
        href={adminUrl}
        className="mt-8 inline-flex h-12 items-center rounded-soft bg-olive px-8 text-sm font-medium text-cream-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Open Admin
      </a>
      <p className="mt-6 max-w-lg text-xs text-ink-soft">
        Legacy Next CRM routes remain below for reference during migration. Prefer
        the Refine app for day-to-day operations.
      </p>
      <details className="mt-10 w-full max-w-5xl text-left">
        <summary className="cursor-pointer text-sm text-olive">
          Show legacy admin (temporary)
        </summary>
        <div className="mt-4 rounded-card border border-olive/10 bg-white/70 p-4">
          {children}
        </div>
      </details>
    </div>
  );
}
