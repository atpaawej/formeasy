import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  PublicForm,
  PublicFormFooter,
} from "@/components/forms/public-form";
import { getFormById } from "@/lib/forms/queries";

/*
 * This route blocks instead of streaming a static shell. A static shell would
 * lock the status code at 200 before we know whether the form exists, and
 * "draft → 404" is a designed behaviour — a shared link must genuinely 404
 * for a draft, not return 200 with a not-found page inside it.
 *
 * Nothing is lost: the whole page is form data, so there is no shell worth
 * prerendering, and the lookup is one indexed read.
 */
export const instant = false;

export async function generateMetadata(
  props: PageProps<"/f/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;

  /*
   * Metadata is decoration, and it runs outside this segment's error boundary:
   * a throw here takes the whole page down before the page's own failure story
   * (a friendly boundary) ever gets a turn. So a form whose title cannot be read
   * loses its title and nothing else. Nothing is hidden by catching here — the
   * page below reads the same row in the same request, and if the database is
   * the problem it fails loudly, with an error boundary and a report.
   */
  const form = await getFormById(id).catch(() => null);
  if (!form || form.status !== "published") return {};

  /*
   * A form with no description still needs something to say under the title in
   * a link preview — an unfurl with a title and a blank line reads as broken.
   * The sentence is the promise the public path makes: no account, no app.
   */
  const description =
    form.description?.trim() || "Answer this form — no account needed.";

  return {
    title: form.title,
    description,
    openGraph: { title: form.title, description },
  };
}

export default async function PublicFormPage(props: PageProps<"/f/[id]">) {
  const { id } = await props.params;
  const form = await getFormById(id);
  if (!form || form.status !== "published") notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-20">
        <PublicForm
          formId={form.id}
          title={form.title}
          description={form.description ?? ""}
          fields={form.fields}
          settings={form.settings}
          accepting={form.acceptResponses}
        />
      </main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
        <PublicFormFooter />
      </footer>
    </div>
  );
}
