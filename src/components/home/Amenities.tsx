"use client";

import { Section } from "@/components/ui/Section";
import { motion } from "framer-motion";
import { Shirt, Sofa, Sun, Utensils, Wifi } from "lucide-react";

const items = [
  {
    icon: Wifi,
    title: "Wi‑Fi built for calls",
    body: "Stable enough for standups — not just browsing.",
  },
  {
    icon: Utensils,
    title: "A kitchen that cooks",
    body: "Full appliances, shared staples, and shelf space with your name on it.",
  },
  {
    icon: Sofa,
    title: "Lounge without the lobby",
    body: "Soft seating, board games, and evenings that don’t feel staged.",
  },
  {
    icon: Sun,
    title: "Rooftop when you need air",
    body: "Sunset chairs and a quiet corner away from the street.",
  },
  {
    icon: Shirt,
    title: "Laundry in-house",
    body: "No coins, no scavenger hunt across the block.",
  },
];

export function Amenities() {
  return (
    <Section
      className="bg-paper"
      eyebrow="The house"
      title="What you share — and what you don’t"
      description="Private rooms stay private. Everything below is maintained for the whole house."
    >
      <div className="grid gap-x-12 gap-y-0 md:grid-cols-2">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="flex gap-4 border-t border-olive/10 py-7"
          >
            <item.icon
              className="mt-0.5 h-5 w-5 shrink-0 text-sage-600"
              strokeWidth={1.75}
            />
            <div>
              <h3 className="font-display text-lg font-medium text-ink">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {item.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
