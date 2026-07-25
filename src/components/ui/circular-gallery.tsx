"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import React, {
  HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";

export interface GalleryItem {
  common: string;
  binomial: string;
  href?: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  /** Distance of items from the center, in px. */
  radius?: number;
  /** Auto-rotation speed when not scrolling. */
  autoRotateSpeed?: number;
  /**
   * When set, rotation tracks scroll through this element
   * (sticky-section pattern) instead of the full document.
   */
  scrollRootSelector?: string;
}

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  (
    {
      items,
      className,
      radius = 520,
      autoRotateSpeed = 0.02,
      scrollRootSelector = "[data-circular-gallery-scroll]",
      ...props
    },
    ref,
  ) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        const section =
          rootRef.current?.closest(scrollRootSelector) ?? null;

        if (section instanceof HTMLElement) {
          const sectionHeight = section.offsetHeight - window.innerHeight;
          const scrolled = -section.getBoundingClientRect().top;
          const progress =
            sectionHeight > 0
              ? Math.min(1, Math.max(0, scrolled / sectionHeight))
              : 0;
          setRotation(progress * 360);
        } else {
          const scrollableHeight =
            document.documentElement.scrollHeight - window.innerHeight;
          const scrollProgress =
            scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
          setRotation(scrollProgress * 360);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      };

      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [scrollRootSelector]);

    useEffect(() => {
      const autoRotate = () => {
        if (!isScrolling) {
          setRotation((prev) => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };

      animationFrameRef.current = requestAnimationFrame(autoRotate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isScrolling, autoRotateSpeed]);

    const anglePerItem = items.length > 0 ? 360 / items.length : 0;

    const setRefs = (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <div
        ref={setRefs}
        role="region"
        aria-label="Circular room gallery"
        className={cn(
          "relative flex h-full w-full items-center justify-center",
          className,
        )}
        style={{ perspective: "2000px" }}
        {...props}
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = rotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(
              relativeAngle > 180 ? 360 - relativeAngle : relativeAngle,
            );
            const opacity = Math.max(0.35, 1 - normalizedAngle / 180);

            const card = (
              <div className="relative h-full w-full overflow-hidden rounded-card border border-olive/10 bg-cream/80 shadow-lift backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.02]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.photo.url}
                  alt={item.photo.text}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: item.photo.pos || "center" }}
                  draggable={false}
                />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-olive/90 via-olive/40 to-transparent p-4 text-cream-50">
                  <h2 className="font-display text-xl font-semibold tracking-tight">
                    {item.common}
                  </h2>
                  <p className="mt-0.5 text-sm text-cream-200">{item.binomial}</p>
                  <p className="mt-2 text-xs text-cream-200/80">
                    {item.photo.by}
                  </p>
                </div>
              </div>
            );

            return (
              <div
                key={`${item.common}-${item.photo.url}`}
                role="group"
                aria-label={item.common}
                className="group absolute h-[230px] w-[175px] sm:h-[255px] sm:w-[192px] lg:h-[275px] lg:w-[206px]"
                style={{
                  transform: `translate(-50%, -50%) rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                  left: "50%",
                  top: "51%",
                  opacity,
                  transition: "opacity 0.3s linear",
                }}
              >
                {item.href ? (
                  <Link href={item.href} className="block h-full w-full">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

CircularGallery.displayName = "CircularGallery";

export { CircularGallery };
