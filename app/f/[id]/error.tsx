"use client";

import { RouteError } from "@/components/route-error";

/*
 * The public form's failure state. No dashboard links and no "your forms" —
 * the person reading this is a respondent, may never have heard of the app, and
 * has nowhere to go but back to the form. So: retry, and a sentence that is
 * about their answer, not about us.
 */
export default function PublicFormError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <RouteError
          error={error}
          retry={retry}
          where="public-form"
          title="This form could not be loaded."
          message="Something went wrong opening the form. Please try again in a moment — if it keeps happening, tell whoever sent you the link."
        />
      </main>
    </div>
  );
}
