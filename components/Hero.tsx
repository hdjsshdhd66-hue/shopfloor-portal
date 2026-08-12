"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { BlueMeshyBackground } from "@/components/ui/blue-meshy-background";
import { Button } from "@/components/ui/button";
import { EASE } from "@/lib/motion";

const HEADLINE_LINES = ["Operational interfaces", "built around", "your workflow."];

const DEPARTMENTS = ["Safety", "Quality", "Maintenance", "Production"];

const lineVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE, delay: 0.15 + i * 0.12 },
  }),
};

// Reduced motion is handled once, globally, by <MotionConfig reducedMotion="user">
// in components/MotionProvider.tsx — it strips transform-based animation
// (position/scale/rotate) while still letting opacity settle to its final
// value, so every motion.* below stays simple: no per-component checks,
// no risk of the "stuck at the hidden state" race that manual
// useReducedMotion() + conditional undefined props can produce.

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-[94vh] items-center overflow-hidden pt-16">
      <BlueMeshyBackground />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Floating dashboard fragments — desktop only, purely decorative,
          communicating "multiple departments, one interface ecosystem". */}
      <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: [14, -6, 14] }}
          transition={{ opacity: { duration: 0.8, delay: 0.9 }, y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.9 } }}
          className="absolute top-[20%] left-[6%] rounded-xl border border-white/10 bg-charcoal/70 px-4 py-3 backdrop-blur-sm"
        >
          <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Open Actions</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">14</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: [-14, 8, -14] }}
          transition={{ opacity: { duration: 0.8, delay: 1.1 }, y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.1 } }}
          className="absolute top-[16%] right-[7%] rounded-xl border border-white/10 bg-charcoal/70 px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-status-ok" />
            <p className="text-xs text-foreground">Inspection complete</p>
          </div>
          <p className="mt-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Quality</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [10, -10, 10] }}
          transition={{ opacity: { duration: 0.8, delay: 1.3 }, y: { duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.3 } }}
          className="absolute right-[10%] bottom-[22%] rounded-xl border border-white/10 bg-charcoal/70 px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-status-pending" />
            <p className="text-xs text-foreground">Action pending</p>
          </div>
          <p className="mt-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Maintenance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: [-10, 10, -10] }}
          transition={{ opacity: { duration: 0.8, delay: 1.0 }, y: { duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1.0 } }}
          className="absolute bottom-[18%] left-[9%] flex items-center gap-1.5 rounded-full border border-white/10 bg-charcoal/70 px-3 py-2 backdrop-blur-sm"
        >
          {DEPARTMENTS.map((d) => (
            <span key={d} className="rounded-full bg-white/5 px-2 py-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              {d}
            </span>
          ))}
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase"
          >
            S47 Digital
          </motion.p>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl lg:text-[4.5rem] lg:leading-[1.05]">
            {HEADLINE_LINES.map((line, i) => (
              <motion.span
                key={line}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={lineVariants}
                className={`block ${i === 2 ? "text-purple-soft" : "text-foreground"}`}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}
            className="mx-auto mt-7 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Custom operational portals, dashboards, and workflow interfaces designed around the
            way your organization actually works — ready for integration within your IT
            environment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.8 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <a href="#solutions">
                Explore Solutions
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
              <a href="#contact">
                Start a Project
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="mt-8 text-xs tracking-[0.06em] text-muted-foreground"
          >
            Built for your operation. Integrated by your IT.
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.4, duration: 0.6 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.4 } }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block"
        aria-hidden
      >
        <div className="h-9 w-[22px] rounded-full border border-white/15 p-1">
          <div className="h-1.5 w-1.5 rounded-full bg-purple-soft" />
        </div>
      </motion.div>
    </section>
  );
}
