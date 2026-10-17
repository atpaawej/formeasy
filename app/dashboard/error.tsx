"use client";

import Link from "next/link";

import { RouteError } from "@/components/route-error";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/*
 * A failure inside the dashboard keeps the dashboard's chrome — the header, the
 * user button, the way back to your forms — because only the page below the
 * layout is replaced. Losing the shell over one failed query is what makes an
 * error feel like a broken app.
 */
export default function DashboardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={retry}
      where="dashboard"
      title="This page could not load."
      message="Your forms are still there. Trying again usually works; if it keeps failing, come back in a minute."
      secondary={
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Your forms
        </Link>
      }
    />
  );
}
