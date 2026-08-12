"use client";

import { Table2, FileWarning, Unlink, EyeOff, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

type ProblemCard = { n: string; icon: LucideIcon; title: string; body: string };

const PROBLEMS: ProblemCard[] = [
  {
    n: "01",
    icon: Table2,
    title: "Spreadsheets",
    body: "Operational information distributed across multiple files.",
  },
  {
    n: "02",
    icon: FileWarning,
    title: "Paper forms",
    body: "Slow reporting, difficult tracking, and limited visibility.",
  },
  {
    n: "03",
    icon: Unlink,
    title: "Disconnected workflows",
    body: "Teams working through separate processes and communication channels.",
  },
  {
    n: "04",
    icon: EyeOff,
    title: "Limited visibility",
    body: "Critical operational information becomes difficult to see and follow.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="max-w-2xl"
        >
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">The Problem</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Operations shouldn&rsquo;t run on scattered tools.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PROBLEMS.map(({ n, icon: Icon, title, body }) => (
            <motion.div
              key={n}
              variants={fadeInUp}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-card/60 p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{n}</span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
