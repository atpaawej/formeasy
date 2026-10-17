"use client";

import { useEffect, type ReactNode } from "react";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/observability";

/*
 * What every route's error boundary renders.
 *
 * The `error.tsx` files stay three lines each: this is where a failure is
 * reported and where the fallback is shaped, so no route invents its own copy of
 * either. `where` names the surface in the log, which is the one thing the
 * report cannot work out for itself.
 *
 * `retry()` re-fetches and re-renders the segment. It is usually the whole fix —
 * a dropped connection, a cold database — so it is the primary action, and it is
 * a real button because it does not navigate anywhere.
 */
export function RouteError({
  error,
  retry,
  where,
  title,
  message,
  secondary,
}: {
  /** Whatever was thrown. From a Server Component this is an `Error`; from the
   *  client it can be anything, so nothing here reads properties off it. */
  error: unknown;
  retry: () => void;
  /** The surface, for the log: "dashboard", "public-form". */
  where: string;
  title: string;
  message: string;
  /** An optional way out for a surface that has somewhere sensible to go. */
  secondary?: ReactNode;
}) {
  useEffect(() => {
    reportError(error, { where });
  }, [error, where]);

  return (
    <ErrorState
      title={title}
      message={message}
      actions={
        <>
          <Button size="sm" onClick={() => retry()}>
            Try again
          </Button>
          {secondary}
        </>
      }
    />
  );
}
