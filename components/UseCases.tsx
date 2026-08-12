"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, BadgeCheck, Wrench, Factory, type LucideIcon } from "lucide-react";
import { fadeInUp, viewportOnce } from "@/lib/motion";

type Department = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: string[];
};

const DEPARTMENTS: Department[] = [
  {
    key: "safety",
    label: "Safety / HSE",
    icon: ShieldCheck,
    items: ["Near Miss", "Incident Reporting", "Risk Assessment", "Permit to Work", "CAPA", "Training"],
  },
  {
    key: "quality",
    label: "Quality",
    icon: BadgeCheck,
    items: ["Inspection Interfaces", "NCR", "Line Clearance", "Quality Records", "Operational Checklists"],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    items: ["Work Requests", "Preventive Maintenance Interfaces", "Equipment Tracking", "Action Status"],
  },
  {
    key: "production",
    label: "Production",
    icon: Factory,
    items: ["Operational Records", "Production Requests", "Shift Information", "Performance Interfaces"],
  },
];

export function UseCases() {
  const [active, setActive] = useState(DEPARTMENTS[0].key);
  const dept = DEPARTMENTS.find((d) => d.key === active) ?? DEPARTMENTS[0];
  const Icon = dept.icon;

  return (
    <section id="solutions" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp} className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Solutions</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for real operations.
          </h2>
        </motion.div>

        {/* Department tabs — sliding active pill */}
        <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Operational departments">
          {DEPARTMENTS.map((d) => {
            const isActive = d.key === active;
            return (
              <button
                key={d.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(d.key)}
                className={`relative rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="dept-pill"
                    className="absolute inset-0 rounded-full bg-purple"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{d.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 p-8">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-purple/25 bg-purple/10">
              <Icon className="size-6 text-purple-soft" />
            </span>
            <div>
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Department</p>
              <p className="mt-1 text-xl font-medium text-foreground">{dept.label}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.ul
                key={dept.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2"
              >
                {dept.items.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <span className="size-1.5 shrink-0 rounded-full bg-purple-soft" />
                    {item}
                  </li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
