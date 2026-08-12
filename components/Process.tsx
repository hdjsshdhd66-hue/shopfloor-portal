"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

const STEPS = [
  { n: 1, title: "Discover", description: "Understand the current operational process." },
  { n: 2, title: "Structure", description: "Map workflows, roles, information, and requirements." },
  { n: 3, title: "Design", description: "Build the system architecture from the user's operational perspective." },
  { n: 4, title: "Develop", description: "Develop the complete front-end operational experience." },
  { n: 5, title: "Validate", description: "Review usability, responsiveness, workflow behavior, and interface logic." },
  {
    n: 6,
    title: "Handover",
    description: "Deliver the front-end system prepared for integration with the client's approved IT infrastructure.",
  },
];

export function Process() {
  return (
    <section id="how-we-work" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp} className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">How We Work</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Built around your operation.
          </h2>
        </motion.div>

        <div className="relative mt-14">
          <div aria-hidden className="absolute top-4 right-6 left-6 hidden h-px overflow-hidden bg-white/10 md:block">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "left" }}
              className="h-full bg-gradient-to-r from-purple/50 via-purple-soft/50 to-purple/20"
            />
          </div>
          <motion.ol
            variants={staggerContainer(0.09)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          >
            {STEPS.map((step) => (
              <motion.li key={step.n} variants={fadeInUp} className="text-left">
                <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-muted-foreground">
                  {step.n}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
