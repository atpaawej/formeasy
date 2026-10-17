"use client";

import { RouteError } from "@/components/route-error";
import "./globals.css";

/*
 * The boundary above the root layout — the only place a failure in the layout
 * itself (the Clerk provider, the theme provider, the fonts) can be caught.
 * Without it, that path ends on the browser's or the host's error page, which is
 * exactly the "stack trace instead of a sentence" this phase is about removing.
 *
 * It replaces the entire document, so it brings its own <html> and <body> and
 * its own copy of the global stylesheet. It cannot reach the theme provider —
 * that is the thing that may have failed — so it renders in the light palette
 * whatever the OS prefers. Accepted: this is the double-failure path, and a
 * legible page in the wrong palette beats a correct palette with no page on it.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center justify-center px-6">
          <RouteError
            error={error}
            retry={retry}
            where="global"
            title="Something went wrong."
            message="The app failed to start. Reloading the page is worth one try — if it does not help, the service is having a bad time and will be back."
          />
        </main>
      </body>
    </html>
  );
}
