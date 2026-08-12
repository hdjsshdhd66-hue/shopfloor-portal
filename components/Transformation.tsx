"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileSpreadsheet, FileText, StickyNote, Mail } from "lucide-react";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

const STEPS = [
  "Understand Process",
  "Map Workflow",
  "Design System",
  "Build Interface",
  "Test Experience",
  "IT Integration",
];

export function Transformation() {
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
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">The Shift</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From manual workflows to digital operating interfaces.
          </h2>
        </motion.div>

        {/* Before / after visual */}
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7 }}
            className="rounded-2xl border border-border bg-card/40 p-8"
          >
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Before</p>
            <div className="relative mt-6 h-40">
              {[
                { Icon: FileSpreadsheet, style: "top-1 left-4 -rotate-6" },
                { Icon: FileText, style: "top-10 right-8 rotate-3" },
                { Icon: StickyNote, style: "bottom-4 left-12 rotate-6" },
                { Icon: Mail, style: "bottom-0 right-2 -rotate-3" },
              ].map(({ Icon, style }, i) => (
                <div
                  key={i}
                  className={`absolute ${style} flex size-14 items-center justify-center rounded-xl border border-border bg-charcoal-2/60`}
                >
                  <Icon className="size-6 text-muted-foreground" />
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Scattered files, forms, and channels — no single source of truth.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="rounded-2xl border border-purple/25 bg-gradient-to-br from-purple/[0.08] to-transparent p-8"
          >
            <p className="text-xs font-medium tracking-[0.16em] text-purple-soft uppercase">After — S47 interface</p>
            <div className="mt-6 flex h-40 flex-col gap-2 rounded-xl border border-border bg-nearblack/60 p-3">
              <div className="flex gap-2">
                <div className="h-6 flex-1 rounded-md bg-white/5" />
                <div className="h-6 w-16 rounded-md bg-purple/25" />
              </div>
              <div className="grid flex-1 grid-cols-3 gap-2">
                <div className="rounded-md bg-white/5" />
                <div className="rounded-md bg-white/5" />
                <div className="rounded-md bg-white/5" />
              </div>
              <div className="h-8 rounded-md bg-white/5" />
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              One structured interface — built around the workflow that already exists.
            </p>
          </motion.div>
        </div>

        {/* Process chain */}
        <motion.ol
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-14 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
        >
          {STEPS.map((step, i) => {
            const isHandoff = i === STEPS.length - 1;
            return (
              <motion.li key={step} variants={fadeInUp} className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium ${
                    isHandoff
                      ? "border-dashed border-white/20 text-muted-foreground"
                      : "border-border bg-card/60 text-foreground"
                  }`}
                >
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/60" />
                )}
              </motion.li>
            );
          })}
        </motion.ol>
        <p className="mt-3 text-xs text-muted-foreground">
          IT Integration: ready for your IT team to connect with approved backend, database,
          authentication, and security infrastructure.
        </p>
      </div>
    </section>
  );
}
