"use client";

import { cn } from "@/lib/utils";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import { ReactNode, useRef } from "react";

interface ScrollSplitCardItem {
  title: string;
  description: string;
  bgColor: string;
  textColor: string;
  icon?: React.ReactNode;
}

interface ScrollSplitCardProps {
  className?: string;
  imageSrc: string;
  cards: ScrollSplitCardItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
  startHint?: string;
  header?: ReactNode;
}

export function ScrollSplitCard({
  className,
  imageSrc,
  cards,
  containerRef: externalContainerRef,
  startHint = "Scroll down",
  header,
}: ScrollSplitCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: externalContainerRef,
    offset: ["start start", "end end"],
  });

  const leftX = useTransform(scrollYProgress, [0, 0.4, 0.8], [0, -48, -24]);
  const rightX = useTransform(scrollYProgress, [0, 0.4, 0.8], [0, 48, 24]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.9]);

  const rotateY = useTransform(scrollYProgress, [0.4, 0.8], [0, 180]);
  const rotateZLeft = useTransform(scrollYProgress, [0.4, 0.8], [0, 6]);
  const rotateZRight = useTransform(scrollYProgress, [0.4, 0.8], [0, -6]);

  const borderRadiusLeft = useTransform(
    scrollYProgress,
    [0, 0.2],
    ["16px 0px 0px 16px", "16px 16px 16px 16px"],
  );
  const borderRadiusMiddle = useTransform(
    scrollYProgress,
    [0, 0.2],
    ["0px 0px 0px 0px", "16px 16px 16px 16px"],
  );
  const borderRadiusRight = useTransform(
    scrollYProgress,
    [0, 0.2],
    ["0px 16px 16px 0px", "16px 16px 16px 16px"],
  );
  const borderOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.2]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.4]);
  const boxShadow = useMotionTemplate`inset 0 1px 1px rgba(255, 255, 255, ${borderOpacity}), inset 0 -24px 48px rgba(0, 0, 0, ${shadowOpacity}), 0 25px 50px -12px rgba(0, 0, 0, ${shadowOpacity})`;

  const startTextOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-[500vh] w-full", className)}
    >
      <div className="sticky top-0 flex h-screen w-full flex-col overflow-hidden [perspective:1200px]">
        {header ? (
          <div className="relative z-20 shrink-0 bg-cream/95 pt-16 pb-2 backdrop-blur-sm md:pt-20 md:pb-3">
            <div className="container-page">
              {header}
              <motion.p
                className="mt-2 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-muted"
                style={{ opacity: startTextOpacity }}
              >
                {startHint}
              </motion.p>
            </div>
          </div>
        ) : (
          <motion.div
            className="relative z-20 shrink-0 bg-cream/95 pt-16 text-center backdrop-blur-sm md:pt-20"
            style={{ opacity: startTextOpacity }}
          >
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
              {startHint}
            </p>
          </motion.div>
        )}

        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 pb-8 pt-1 md:pb-10">
          <motion.div
            style={{ scale, transformStyle: "preserve-3d" }}
            className="relative flex h-[400px] w-full max-w-4xl"
          >
            {cards.slice(0, 3).map((card, i) => (
              <motion.div
                key={i}
                className="relative h-full flex-1"
                style={{
                  x: i === 0 ? leftX : i === 2 ? rightX : 0,
                  rotateY,
                  rotateZ: i === 0 ? rotateZLeft : i === 2 ? rotateZRight : 0,
                  zIndex: i,
                  transformStyle: "preserve-3d",
                }}
              >
                <motion.div
                  className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
                  style={{
                    zIndex: 2,
                    borderRadius:
                      i === 0
                        ? borderRadiusLeft
                        : i === 2
                          ? borderRadiusRight
                          : borderRadiusMiddle,
                    boxShadow,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute top-0 h-full w-[300%] max-w-none object-cover object-center"
                    style={{ left: `${-100 * i}%` }}
                  />
                </motion.div>

                <motion.div
                  className={cn(
                    "absolute inset-0 flex flex-col justify-end overflow-hidden p-6 [backface-visibility:hidden] will-change-transform md:p-8",
                    "border border-white/5 bg-gradient-to-br from-white/10 to-transparent",
                    "shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-24px_48px_rgba(0,0,0,0.2)]",
                  )}
                  style={{
                    backgroundColor: card.bgColor,
                    color: card.textColor,
                    transform: "rotateY(180deg)",
                    zIndex: 1,
                    borderRadius:
                      i === 0
                        ? borderRadiusLeft
                        : i === 2
                          ? borderRadiusRight
                          : borderRadiusMiddle,
                    boxShadow,
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                    style={{
                      backgroundImage: `url("https://framerusercontent.com/images/6mcf62RlDfRfU61Yg5vb2pefpi4.png?width=256&height=256")`,
                      backgroundRepeat: "repeat",
                    }}
                  />

                  <div className="relative z-10 mb-auto">{card.icon}</div>
                  <h3 className="relative z-10 mb-3 font-display text-xl font-semibold leading-tight md:mb-4 md:text-2xl">
                    {card.title}
                  </h3>
                  <p className="relative z-10 text-sm leading-relaxed opacity-85">
                    {card.description}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
