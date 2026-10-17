import Link from "next/link";

import { ErrorState } from "@/components/error-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/*
 * The app's 404. It answers the two ways a person gets here: a link that was
 * never right, and a form id that belongs to someone else — which the dashboard
 * answers with a 404 on purpose, so an id you do not own is indistinguishable
 * from one that does not exist. See docs/design.md.
 *
 * The public form has its own 404 next door, with copy for a respondent rather
 * than for an owner.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-16">
      <ErrorState
        tone="neutral"
        title="This page isn't here."
        message="The link may be mistyped, or whatever it pointed at is gone. Nothing you did broke anything."
        actions={
          <>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Your forms
            </Link>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Home
            </Link>
          </>
        }
      />
    </main>
  );
}
