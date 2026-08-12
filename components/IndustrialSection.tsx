"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

/**
 * "Real operations" cinematic section.
 *
 * The brief calls for a full-width photo of a modern manufacturing floor.
 * No licensed photo ships with this project, and an unreliable remote image
 * URL is worse than no image — so this renders a premium abstract
 * atmosphere (structural line work, not a stock photo) by default.
 *
 * To swap in a real photo once the client provides one: drop the file at
 * `/public/images/industrial-operations.webp` and replace the
 * `<AtmosphereFallback />` below with:
 *
 *   <Image src="/images/industrial-operations.webp" alt="..." fill
 *     className="object-cover" priority={false} />
 *
 * — the dark overlay, vignette, and overlay cards need no changes.
 */

const OVERLAYS = [
  { dept: "Quality", label: "Inspection Complete", tone: "ok" as const, pos: "left-[6%] top-[18%]" },
  { dept: "Safety", label: "Action Pending", tone: "pending" as const, pos: "right-[8%] top-[26%]" },
  { dept: "Maintenance", label: "Work Request", tone: "pending" as const, pos: "left-[10%] bottom-[22%]" },
  { dept: "Production", label: "Operational Status", tone: "ok" as const, pos: "right-[6%] bottom-[16%]" },
];

function AtmosphereFallback() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0c0c0e_0%,#050506_60%,#0c0c0e_100%)]" />
      {/* Structural line work — suggests architecture/infrastructure without pretending to be a photo. */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" preserveAspectRatio="none" viewBox="0 0 1200 600" fill="none">
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={i} x1={i * 100} y1="0" x2={i * 100 - 140} y2="600" stroke="white" strokeWidth="1" />
        ))}
        <line x1="0" y1="180" x2="1200" y2="180" stroke="white" strokeWidth="1" />
        <line x1="0" y1="420" x2="1200" y2="420" stroke="white" strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(139,92,246,0.1),transparent_70%)]" />
    </div>
  );
}

const toneDot = { ok: "bg-status-ok", pending: "bg-status-pending" };

export function IndustrialSection() {
  return (
    <section className="relative overflow-hidden border-t border-border py-28 sm:py-36">
      <AtmosphereFallback />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/70" aria-hidden />

      {/* Overlay interface cards — explicitly UI overlays, not implied live data. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        {OVERLAYS.map((o, i) => (
          <motion.div
            key={o.dept}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, delay: 0.15 + i * 0.12 }}
            className={`absolute ${o.pos} rounded-xl border border-white/10 bg-charcoal/80 px-4 py-2.5 backdrop-blur-sm`}
          >
            <div className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${toneDot[o.tone]}`} />
              <span className="text-xs text-foreground">{o.label}</span>
            </div>
            <p className="mt-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{o.dept}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-8"
      >
        <motion.p variants={fadeInUp} className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Real Operations
        </motion.p>
        <motion.h2 variants={fadeInUp} className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Real operations. <span className="text-purple-soft">Better interfaces.</span>
        </motion.h2>
        <motion.p variants={fadeInUp} className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-muted-foreground">
          Operational systems should reflect how work actually happens. S47 transforms real
          workflows into structured digital interfaces designed for the people who use them
          every day.
        </motion.p>
      </motion.div>
    </section>
  );
}
