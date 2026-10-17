import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CreateFormButton } from "@/components/forms/create-form-button";
import { FormList, FormListSkeleton } from "@/components/forms/form-list";
import { listForms } from "@/lib/forms/queries";

/**
 * Reads auth and the database, so it lives behind a Suspense boundary and
 * streams into the prerendered shell.
 */
export async function FormsSection() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const forms = await listForms(userId);

  if (forms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-serif text-lg">Nothing here yet.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a form, add some questions, and publish it when you are ready
          for answers.
        </p>
        <CreateFormButton />
      </div>
    );
  }

  return <FormList forms={forms} />;
}

export function FormsSectionSkeleton() {
  return <FormListSkeleton />;
}
