import type { Variants } from "framer-motion";

/**
 * Shared Framer Motion variants — one small set reused across sections so
 * the whole page moves with one consistent rhythm instead of every
 * component inventing its own timing/easing.
 */

export const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

export const staggerContainer = (stagger = 0.09, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
};

/** Standard viewport config for whileInView reveals — fires once, a little before full entry. */
export const viewportOnce = { once: true, margin: "-80px" } as const;
