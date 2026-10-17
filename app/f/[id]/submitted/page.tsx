import { CheckIcon } from "lucide-react";

import { PublicFormFooter } from "@/components/forms/public-form";
import {
  DEFAULT_THANK_YOU_MESSAGE,
  DEFAULT_THANK_YOU_TITLE,
} from "@/lib/fields";
import { getFormById } from "@/lib/forms/queries";

// Blocking, like /f/[id]: it reads the form's thank-you copy before rendering,
// so there is no default-message flash to stream around.
export const instant = false;

export const metadata = { title: "Response recorded" };

export default async function SubmittedPage(
  props: PageProps<"/f/[id]/submitted">,
) {
  const { id } = await props.params;
  const form = await getFormById(id);

  const title = form?.settings.thankYouTitle || DEFAULT_THANK_YOU_TITLE;
  const message = form?.settings.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE;

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckIcon className="size-5" />
          </span>
          <h1 className="font-serif text-2xl leading-tight text-balance">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-8 text-center sm:px-6">
        <PublicFormFooter />
      </footer>
    </div>
  );
}
