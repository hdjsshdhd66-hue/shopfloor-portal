"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Applies `prefers-reduced-motion` to every Framer Motion animation in the
 * app from one place, instead of each section re-checking the media query.
 * `reducedMotion="user"` makes Framer Motion honor the OS setting
 * automatically — transitions still reach their end state, they just skip
 * the animated transform.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
