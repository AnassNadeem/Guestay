"use client";

import { Section } from "@/components/ui/Section";
import type { Testimonial } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [lead, ...rest] = items;

  if (!lead) return null;

  return (
    <Section
      eyebrow="Stays"
      title="What it feels like when the house works"
      description="Short notes from people who lived here longer than a weekend."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.blockquote
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-between rounded-card bg-olive p-8 text-cream-50 md:p-10"
        >
          <p className="font-display text-2xl font-medium leading-snug tracking-tight md:text-3xl">
            “{lead.quote}”
          </p>
          <footer className="mt-10 flex items-center gap-3 border-t border-cream-50/15 pt-6">
            <Image
              src={lead.avatar}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <cite className="not-italic font-medium">{lead.name}</cite>
              <p className="text-sm text-cream-200">
                {lead.role} · {lead.location}
              </p>
            </div>
          </footer>
        </motion.blockquote>

        <div className="flex flex-col gap-6">
          {rest.map((t, i) => (
            <motion.blockquote
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08 + i * 0.06 }}
              className="flex flex-1 flex-col rounded-card bg-white p-6 shadow-soft"
            >
              <p className="flex-1 text-[1.05rem] leading-relaxed text-ink">
                “{t.quote}”
              </p>
              <footer className="mt-6 flex items-center gap-3 border-t border-olive/5 pt-4">
                <Image
                  src={t.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <cite className="not-italic text-sm font-medium text-ink">
                    {t.name}
                  </cite>
                  <p className="text-xs text-ink-muted">
                    {t.role} · {t.stayDuration}
                  </p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </Section>
  );
}
