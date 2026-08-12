"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border py-28 text-center sm:py-36">
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(139,92,246,0.22),transparent_70%)] blur-3xl"
      />

      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative z-10 mx-auto max-w-2xl px-5 sm:px-8"
      >
        <motion.h2 variants={fadeInUp} className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Your operation can work better.
        </motion.h2>
        <motion.p variants={fadeInUp} className="mx-auto mt-5 max-w-md text-balance text-base text-muted-foreground">
          Let&rsquo;s design the interface behind it.
        </motion.p>
        <motion.div variants={fadeInUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <a href="#contact">
              Start a Project
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
            <a href="#contact">Discuss Your Workflow</a>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
