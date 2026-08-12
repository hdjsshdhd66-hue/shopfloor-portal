"use client";

import { motion } from "framer-motion";
import { Check, ArrowLeftRight } from "lucide-react";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

const S47_SCOPE = [
  "Operational UX",
  "Interface Architecture",
  "Front-End Development",
  "Dashboards",
  "Digital Forms",
  "Workflow UI",
  "Responsive Experience",
  "Print Interfaces",
  "Front-End Validation",
];

const CLIENT_SCOPE = [
  "Backend",
  "Database",
  "Authentication",
  "Cybersecurity",
  "Infrastructure",
  "Corporate Network",
  "Data Governance",
  "Enterprise Integration",
];

function ScopeList({ items, tone }: { items: string[]; tone: "purple" | "neutral" }) {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
              tone === "purple" ? "bg-purple/20 text-purple-soft" : "bg-white/10 text-muted-foreground"
            }`}
          >
            <Check className="size-2.5" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ScopeClarity() {
  return (
    <section className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp} className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Scope</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear responsibilities. Better integration.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="relative mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch"
        >
          <motion.div variants={fadeInUp} className="rounded-2xl border border-purple/25 bg-gradient-to-br from-purple/[0.07] to-transparent p-7">
            <p className="text-xs font-medium tracking-[0.16em] text-purple-soft uppercase">S47 Digital</p>
            <ScopeList items={S47_SCOPE} tone="purple" />
          </motion.div>

          <motion.div variants={fadeInUp} className="hidden items-center justify-center lg:flex">
            <span className="flex size-11 items-center justify-center rounded-full border border-border bg-charcoal text-muted-foreground">
              <ArrowLeftRight className="size-4" />
            </span>
          </motion.div>

          <motion.div variants={fadeInUp} className="rounded-2xl border border-border bg-card/50 p-7">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Client IT</p>
            <ScopeList items={CLIENT_SCOPE} tone="neutral" />
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-center text-sm font-medium tracking-[0.06em] text-muted-foreground"
        >
          ONE OPERATIONAL EXPERIENCE.
        </motion.p>
      </div>
    </section>
  );
}
