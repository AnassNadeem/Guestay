import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center bg-paper pt-24">
      <div className="container-page py-20 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mark.svg"
          alt=""
          width={72}
          height={60}
          className="mx-auto h-14 w-auto opacity-80"
        />
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-sage-600">
          404
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-olive md:text-5xl">
          This room doesn’t exist
        </h1>
        <p className="mx-auto mt-4 max-w-md text-ink-muted">
          The page you’re looking for isn’t in the house. Head back to rooms or
          the homepage.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-soft bg-olive px-5 text-sm font-medium text-cream-50 shadow-soft transition-colors hover:bg-olive-700"
          >
            Go home
          </Link>
          <Link
            href="/rooms"
            className="inline-flex h-11 items-center rounded-soft border border-olive/20 px-5 text-sm font-medium text-olive transition-colors hover:bg-cream-100"
          >
            Browse rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
