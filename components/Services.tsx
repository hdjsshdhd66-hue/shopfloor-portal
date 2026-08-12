"use client";

import { motion } from "framer-motion";
import { LayoutGrid, GitBranch, Gauge, ClipboardList, type LucideIcon } from "lucide-react";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

type Capability = { n: string; icon: LucideIcon; title: string; body: string };

const CAPABILITIES: Capability[] = [
  {
    n: "01",
    icon: LayoutGrid,
    title: "Operational Portals",
    body: "Centralized interfaces designed around departments, roles, and operational workflows.",
  },
  {
    n: "02",
    icon: GitBranch,
    title: "Workflow Interfaces",
    body: "Digital requests, approvals, assignments, status tracking, and action workflows.",
  },
  {
    n: "03",
    icon: Gauge,
    title: "Dashboards & Management Views",
    body: "Clear operational visibility through structured KPIs, statuses, actions, and management views.",
  },
  {
    n: "04",
    icon: ClipboardList,
    title: "Digital Forms & Tools",
    body: "Purpose-built interfaces for inspections, reporting, assessments, training, and operational records.",
  },
];

export function Services() {
  return (
    <section id="what-we-build" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp} className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">What We Build</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Operational interfaces, not generic software.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {CAPABILITIES.map(({ n, icon: Icon, title, body }) => (
            <motion.div
              key={n}
              variants={fadeInUp}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-7"
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent transition-colors duration-500 group-hover:border-purple/35"
                aria-hidden
              />
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl border border-purple/25 bg-purple/10 transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-5 text-purple-soft" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">{n}</span>
              </div>
              <h3 className="mt-5 text-lg font-medium text-foreground">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
