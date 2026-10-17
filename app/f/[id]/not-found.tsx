import { ErrorState } from "@/components/error-state";
import { PublicFormFooter } from "@/components/forms/public-form";

/*
 * A form's 404 — the answer for a draft, a deleted form, or an id that was never
 * anything. A respondent following an old link is the likely reader, so the copy
 * is addressed to them: nothing about drafts, nothing about publishing, and
 * nothing that suggests they did something wrong. "Ask whoever sent it" is the
 * only action available to them, so that is what it says.
 *
 * It still returns a real 404: the public page blocks rather than streaming, so
 * the status code is settled before the body. See app/f/[id]/page.tsx.
 */
export default function PublicFormNotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <ErrorState
          tone="neutral"
          title="This form isn't available."
          message="The link may have stopped working, or the form may have been taken down. If someone sent it to you, ask them to check the link."
        />
      </main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-10 text-center sm:px-6">
        <PublicFormFooter />
      </footer>
    </div>
  );
}
