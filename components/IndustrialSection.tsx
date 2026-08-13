"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { EASE, fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

/**
 * Cinematic full-width shop-floor visual — the one deliberate break from the
 * card-and-grid rhythm used everywhere else on the page. A real manufacturing
 * photo (self-hosted at /public/images/shop-floor.webp — Unsplash License,
 * free for commercial use, no visible brands, no people as the subject) sits
 * under a dark + purple brand treatment so it reads as premium atmosphere
 * rather than a generic stock banner.
 *
 * Motion: the outer wrapper does a one-time fade/scale reveal via
 * `whileInView` (governed globally by <MotionConfig reducedMotion="user">,
 * same as every other section). The inner layer adds a continuous,
 * scroll-linked parallax drift driven by `useScroll`/`useTransform` — a pure
 * motion value, not an animate/initial state machine, so it carries none of
 * the "stuck hidden" hydration risk that manual reduced-motion branching
 * caused elsewhere; it is simply zeroed out when the user prefers less motion.
 */

const OVERLAYS = [
  { dept: "Quality", label: "Inspection Complete", tone: "ok" as const, pos: "left-[6%] top-[18%]" },
  { dept: "Safety", label: "Action Pending", tone: "pending" as const, pos: "right-[8%] top-[26%]" },
  { dept: "Maintenance", label: "Work Request", tone: "pending" as const, pos: "left-[10%] bottom-[22%]" },
  { dept: "Production", label: "Operational Status", tone: "ok" as const, pos: "right-[6%] bottom-[16%]" },
];

const toneDot = { ok: "bg-status-ok", pending: "bg-status-pending" };

export function IndustrialSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], prefersReduced ? ["0%", "0%"] : ["-9%", "9%"]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden border-t border-border py-32 sm:py-44 lg:min-h-[74vh]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 1.09 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 1.2, ease: EASE }}
        className="absolute inset-0"
        aria-hidden
      >
        <motion.div style={{ y: parallaxY }} className="absolute inset-[-10%]">
          <Image
            src="/images/shop-floor.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority={false}
          />
        </motion.div>

        {/* Dark + purple/violet brand treatment */}
        <div className="absolute inset-0 bg-[#050506]/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/20 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_50%_45%,rgba(139,92,246,0.32),transparent_72%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/75 via-transparent to-background/55" />
      </motion.div>

      {/* Overlay interface cards — explicit UI overlays, not implied live data. */}
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
        <motion.p
          variants={fadeInUp}
          className="text-xs font-medium tracking-[0.22em] text-purple-soft uppercase"
        >
          Digital Transformation
        </motion.p>
        <motion.h2
          variants={fadeInUp}
          className="mt-4 text-balance text-4xl leading-[1.05] font-semibold tracking-tight uppercase sm:text-6xl lg:text-7xl"
        >
          Built for the <span className="text-purple-soft">shop floor.</span>
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Supporting smarter, more connected and more efficient manufacturing operations.
        </motion.p>
      </motion.div>
    </section>
  );
}
