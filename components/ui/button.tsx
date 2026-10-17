"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { motion } from "motion/react"

import {
  buttonVariants,
  type VariantProps,
} from "@/components/ui/button-variants"
import { Spinner } from "@/components/ui/spinner"
import { tap } from "@/lib/motion"
import { cn } from "@/lib/utils"

/*
 * The one button in the app.
 *
 * `loading` is a real state, not a styling one: it disables the button, marks it
 * busy for assistive tech, shows a spinner in front of the label, and drops the
 * press animation — so the same action cannot be fired twice while the first is
 * still in flight.
 *
 * The press is framer-motion's `whileTap`, which composes with the button's own
 * CSS translate because Tailwind v4 writes the `translate` property and motion
 * writes `transform`. They do not fight.
 *
 * base-ui's Button and motion both declare an `onDrag`, with different
 * signatures (a DOM drag event versus a gesture callback). It is dropped here:
 * this button is never draggable, and every motion prop stays available.
 *
 * A link is not a button. Anything that navigates is a `<Link>`/`<a>` wearing
 * `buttonVariants` — see app/page.tsx — because rendering one inside this
 * component's `render` prop warns (base-ui: the element stops being a real
 * <button>), and `role="button"` would cost a link its own semantics.
 */
type MotionButtonProps = Omit<
  ButtonPrimitive.Props,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  // base-ui lets `style` be a function of component state; motion's is a
  // MotionStyle. Nothing here styles a button that way.
  | "style"
>

const MotionButton = motion.create<MotionButtonProps, "button">(ButtonPrimitive)

type ButtonProps = MotionButtonProps &
  VariantProps<typeof buttonVariants> & {
    /** Blocks interaction and shows a spinner in front of the label. */
    loading?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const inert = disabled || loading

  return (
    <MotionButton
      data-slot="button"
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      disabled={inert}
      whileTap={inert ? undefined : { scale: 0.97 }}
      transition={tap}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <Spinner className="size-3.5" /> : null}
      {children}
    </MotionButton>
  )
}

export { Button }
