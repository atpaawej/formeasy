import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { Builder } from "@/components/builder/builder";
import { Skeleton } from "@/components/ui/skeleton";
import { getOwnedForm } from "@/lib/forms/queries";

export const metadata = { title: "Edit form" };

export default function EditFormPage(
  props: PageProps<"/dashboard/forms/[id]/edit">,
) {
  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <Editor params={props.params} />
    </Suspense>
  );
}

// Awaits the promise params inside the boundary, so the shell can prerender.
async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const form = await getOwnedForm(userId, id);
  if (!form) notFound();

  return (
    <Builder
      formId={form.id}
      initialTitle={form.title}
      initialDescription={form.description ?? ""}
      initialFields={form.fields}
      initialStatus={form.status}
    />
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="hidden h-64 rounded-xl lg:block" />
      </div>
    </div>
  );
}
