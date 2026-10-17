"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/*
 * `reducedMotion="user"` makes every animation in the app obey the operating
 * system's reduce-motion setting: transforms and layout movement are dropped
 * while opacity still crossfades, so nothing is left invisible. Set once, here,
 * rather than remembered in each component.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
