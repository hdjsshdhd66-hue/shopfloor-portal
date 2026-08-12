"use client";

import { motion } from "framer-motion";
import { fadeInUp, viewportOnce } from "@/lib/motion";

export function About() {
  return (
    <section id="about" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp}>
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">About</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            One focus, done properly.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-foreground">
            S47 DIGITAL focuses on one thing: turning operational workflows into clear,
            professional digital interfaces.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            We design systems around the real process — not the other way around. Our front-end
            solutions are structured for integration within the client&rsquo;s approved IT
            environment.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
