"use client"

import type { ReactNode } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon } from "lucide-react"

import {
  buttonVariants,
  type VariantProps,
} from "@/components/ui/button-variants"
import { Spinner } from "@/components/ui/spinner"
import { pop, tap } from "@/lib/motion"
import { cn } from "@/lib/utils"

/*
 * The one button in the app, and the four states it can be in.
 *
 *  - resting  — label, hover, focus ring, and an `active:` press. All CSS, so it
 *    costs nothing before hydration.
 *  - loading  — disabled, `aria-busy`, and a spinner pops in where the label was.
 *    This is what makes double-submit impossible, which matters most on the
 *    public form.
 *  - success  — the completed state: a check pops in and the label becomes
 *    `successLabel`. The caller owns the timing (see CopyLinkButton).
 *  - disabled — dimmed and untouchable.
 *
 * The spinner does not sit *beside* the label; it takes its place. Both the
 * resting label and the stand-in live in the same grid cell, so the button keeps
 * the label's width while it is loading and nothing around it shifts — which is
 * the whole point, since a button that resizes under the pointer feels broken.
 * The resting layer stays in the tree (faded, not `hidden`) so the button keeps
 * its accessible name while it is busy.
 *
 * `successLabel` replaces the rest of the content rather than joining it, so a
 * button that carries its own icon does not end up with two. Pass it for any
 * labelled button; leave it off and the completed state is just the check.
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
    /** Blocks interaction and shows a spinner in the label's place. */
    loading?: boolean
    /** The completed state: a check pops in and the label becomes `successLabel`. */
    success?: boolean
    /** What the button reads while `success` is true. */
    successLabel?: ReactNode
  }

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  success = false,
  successLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const state = loading ? "loading" : success ? "success" : "idle"
  const inert = disabled || loading

  return (
    <MotionButton
      data-slot="button"
      data-state={state}
      aria-busy={loading || undefined}
      disabled={inert}
      whileTap={inert ? undefined : { scale: 0.97 }}
      transition={tap}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      <span className="grid place-items-center">
        {/* The resting content, holding the button's width and its name. It
            fades rather than blinks, so the label and the stand-in cross over. */}
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-center gap-(--btn-gap) transition-opacity duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
            state !== "idle" && "opacity-0",
          )}
        >
          {children}
        </span>

        {/* The stand-in: a spinner while it works, a check when it is done. */}
        <AnimatePresence initial={false}>
          {state !== "idle" ? (
            <motion.span
              key={state}
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={pop}
              className="pointer-events-none col-start-1 row-start-1 inline-flex items-center justify-center gap-(--btn-gap)"
            >
              {state === "loading" ? (
                <Spinner className="size-3.5" />
              ) : (
                <CheckIcon className="size-3.5" />
              )}
              {state === "success" ? successLabel : null}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
    </MotionButton>
  )
}

export { Button }
