import type { Transition } from "motion/react";

/*
 * The app's motion language, in one place.
 *
 * Fluidity is not decoration here: motion says what changed and where it came
 * from, and then gets out of the way. Everything is short, uses one easing
 * curve, and never moves further than it needs to. See docs/design-system.md.
 *
 * These are plain values, so a server component may import them too — only the
 * components that use them need to be client components.
 */

/** Decelerating: gentle at the end. The default for anything entering. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Symmetric: for something moving between two known places. */
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Anything entering or leaving: fast, and never longer than this. */
export const enter: Transition = { duration: 0.24, ease: EASE_OUT };

/** A panel opening or a page settling. */
export const settle: Transition = { duration: 0.32, ease: EASE_OUT };

/** A press. Quick enough to read as contact rather than bounce. */
export const tap: Transition = {
  type: "spring",
  stiffness: 640,
  damping: 34,
  mass: 0.6,
};

/** A panel expanding: a little travel, a little overshoot. */
export const panel: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Something sliding between two slots (a tab indicator, a reordered card). */
export const glide: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.8,
};

/**
 * A staggered entrance. Capped, so the last row of a long list is not stuck
 * waiting its turn.
 */
export function stagger(index: number, step = 0.03, max = 8): Transition {
  return { ...enter, delay: Math.min(index, max) * step };
}

export const riseIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
} as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
} as const;
