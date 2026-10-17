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
  const form = await getFormById(id);
  if (!form || form.status !== "published") return {};

  return {
    title: form.title,
    description: form.description ?? undefined,
  };
}

export default async function PublicFormPage(props: PageProps<"/f/[id]">) {
  const { id } = await props.params;
  const form = await getFormById(id);
  if (!form || form.status !== "published") notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16">
        <PublicForm
          formId={form.id}
          title={form.title}
          description={form.description ?? ""}
          fields={form.fields}
          settings={form.settings}
          accepting={form.acceptResponses}
        />
      </main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-8 sm:px-6">
        <PublicFormFooter />
      </footer>
    </div>
  );
}
