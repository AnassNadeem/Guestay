"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * Hero 3D surface.
 * Current: R3F HouseMark (logo silhouette).
 * Later: pass a Spline scene URL into a sibling SplineHero and swap here without redesigning the section.
 */
const HeroScene = dynamic(
  () => import("@/components/three/HeroScene").then((m) => m.HeroScene),
  { ssr: false },
);

function shouldUse3D(): boolean {
  if (typeof window === "undefined") return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const saveData =
    "connection" in navigator &&
    Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData,
    );
  return !(reduced || coarse || narrow || saveData);
}

export function HeroCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabled(shouldUse3D());
    setReady(true);

    const onChange = () => setEnabled(shouldUse3D());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "80px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show3D = ready && enabled && inView;

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full max-h-[560px] overflow-hidden lg:max-h-none"
      aria-hidden
    >
      {!show3D && (
        <div className="absolute inset-0 flex items-center justify-center p-10 sm:p-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-light.png"
            alt=""
            width={320}
            height={280}
            className="h-auto w-[72%] object-contain"
          />
        </div>
      )}
      {show3D && (
        <div className="absolute inset-0">
          <HeroScene />
        </div>
      )}
    </div>
  );
}
