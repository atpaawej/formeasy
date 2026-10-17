"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { enter, riseIn } from "@/lib/motion";

/*
 * A template remounts when the segment below it changes — that is, every time we
 * move between Questions and Responses. So it is the right place for the page
 * entrance: one short rise, and the new view has arrived rather than replaced
 * the old one between frames.
 *
 * It sits at the form's own segment, inside the layout, so the section nav above
 * it stays mounted and the tab pill can still slide.
 */
export default function FormTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={riseIn.initial}
      animate={riseIn.animate}
      transition={enter}
    >
      {children}
    </motion.div>
  );
}
