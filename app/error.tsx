"use client";

import { RouteError } from "@/components/route-error";

/*
 * The last boundary below the root layout: anything that fails on a shell page —
 * landing, dashboard, sign-in — lands here. Errors inside a nested segment are
 * caught by that segment's own boundary first, so this shows the app-level copy.
 * See docs/design.md.
 */
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-16">
      <RouteError
        error={error}
        retry={retry}
        where="app"
        title="Something went wrong."
        message="This page failed to load. Trying again usually fixes it — if it does not, that is our bug, not yours."
      />
    </main>
  );
}
