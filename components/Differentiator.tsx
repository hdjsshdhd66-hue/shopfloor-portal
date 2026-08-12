"use client";

import { motion } from "framer-motion";
import { viewportOnce } from "@/lib/motion";

const STATEMENTS = [
  "Built around your workflow.",
  "Designed for your teams.",
  "Structured for your operation.",
  "Prepared for your IT environment.",
];

export function Differentiator() {
  return (
    <section className="border-t border-border py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7 }}
          className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl"
        >
          Not another generic software platform.
        </motion.h2>

        <div className="mt-14 flex flex-col items-center gap-5 sm:gap-6">
          {STATEMENTS.map((line, i) => (
            <motion.p
              key={line}
              initial={{ opacity: 0.15, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-balance text-xl font-medium text-muted-foreground sm:text-2xl"
            >
              {line}
            </motion.p>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, delay: 0.75 }}
          className="mt-14 text-balance text-2xl font-semibold sm:text-3xl"
        >
          Built for your operation.
          <br />
          <span className="text-purple-soft">Integrated by your IT.</span>
        </motion.p>
      </div>
    </section>
  );
}
