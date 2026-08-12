"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

const INDUSTRIES = [
  "Manufacturing",
  "Food & Beverage",
  "Industrial Operations",
  "Warehousing",
  "Logistics",
  "Facilities",
  "Operational Services",
];

export function Industries() {
  return (
    <section id="industries" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp} className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Industries</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Interfaces adaptable to operational environments such as —
          </h2>
        </motion.div>

        <motion.ul
          variants={staggerContainer(0.06)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-9 flex flex-wrap gap-3"
        >
          {INDUSTRIES.map((industry) => (
            <motion.li
              key={industry}
              variants={fadeInUp}
              className="rounded-full border border-border bg-card/50 px-4 py-2 text-sm text-foreground transition-colors hover:border-purple/35"
            >
              {industry}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
