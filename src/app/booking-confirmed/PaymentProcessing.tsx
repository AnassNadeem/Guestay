"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 2500;
const TIMEOUT_MS = 180_000; // 3 minutes

type Props = { tracker: string };

export function PaymentProcessing({ tracker }: Props) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;
      if (Date.now() - started.current > TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      try {
        const res = await fetch(
          `/api/bookings/by-tracker?tracker=${encodeURIComponent(tracker)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          ready?: boolean;
          reference?: string | null;
          scenario?: string | null;
          status?: string | null;
        };
        if (cancelled) return;
        if (data.status) setLastStatus(data.status);
        if (data.ready && data.reference) {
          const qs = new URLSearchParams({ ref: data.reference });
          if (data.scenario) qs.set("scenario", data.scenario);
          router.replace(`/booking-confirmed?${qs.toString()}`);
          return;
        }
      } catch {
        /* keep polling */
      }
      timer = setTimeout(poll, POLL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tracker, router]);

  if (timedOut) {
    return (
      <div className="bg-paper pt-24 md:pt-28">
        <div className="container-page max-w-narrow pb-20">
          <p className="text-eyebrow text-olive">Still processing</p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Payment confirmation delayed
          </h1>
          <p className="mt-3 text-ink-muted">
            We have not received webhook confirmation yet
            {lastStatus ? ` (current status: ${lastStatus})` : ""}. If you were
            charged, contact us with your tracker ID — do not pay again.
          </p>
          <p className="mt-4 font-mono text-sm text-ink-soft">{tracker}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full bg-olive px-6 text-sm font-medium text-cream-50"
              onClick={() => {
                setTimedOut(false);
                started.current = Date.now();
              }}
            >
              Keep waiting
            </button>
            <Link
              href="/rooms"
              className="inline-flex h-11 items-center rounded-full border border-olive/20 px-6 text-sm font-medium text-olive"
            >
              Browse rooms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page max-w-narrow pb-20">
        <p className="text-eyebrow text-olive">Processing</p>
        <h1 className="mt-2 font-display text-4xl text-ink">
          Confirming your payment…
        </h1>
        <p className="mt-3 text-ink-muted">
          Please wait while we verify your payment with our payment provider.
          This page updates automatically — do not close it or pay again.
        </p>
        <div
          className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-olive/10"
          aria-hidden
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-olive" />
        </div>
        <p className="mt-6 font-mono text-xs text-ink-soft">Tracker: {tracker}</p>
      </div>
    </div>
  );
}
