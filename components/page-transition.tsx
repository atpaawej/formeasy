import type { ReactNode } from "react";
import { ViewTransition } from "react";

/*
 * A page's arrival and departure, handed to the browser through React's
 * `<ViewTransition>` and the View Transitions API.
 *
 * Why this and not another `template.tsx`: a template remounts its subtree, so
 * putting one high enough to span the shell pages would also remount the form's
 * section layout on every tab switch — and that is what lets the active tab pill
 * slide. A view transition snapshots the old and new DOM and crossfades between
 * them without remounting React, so the pill (framer-motion's `layoutId`) keeps
 * its slide underneath.
 *
 * It wraps the *shell* pages — the landing and the dashboard — not the form's
 * two views, which live inside a shared layout and already animate through
 * `app/dashboard/forms/[id]/template.tsx`. Navigating anywhere from a shell page
 * starts the transition; navigation between the form's own tabs does not, so the
 * two systems never run at once.
 *
 * The animation itself is CSS, in `app/globals.css`. With no browser support
 * (or no JavaScript) the page simply arrives instantly, which is what it did
 * before — this is an enhancement, never a requirement.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out">
      {children}
    </ViewTransition>
  );
}
