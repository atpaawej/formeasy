import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { ResponsesScreen } from "@/components/responses/responses-screen";
import { ResponsesSkeleton } from "@/components/responses/responses-skeleton";
import { getOwnedForm, listResponses } from "@/lib/forms/queries";

export const metadata = { title: "Responses" };

export default function ResponsesPage(
  props: PageProps<"/dashboard/forms/[id]">,
) {
  return (
    <Suspense fallback={<ResponsesSkeleton />}>
      <Responses params={props.params} />
    </Suspense>
  );
}

// Awaits the promise params inside the boundary, so the shell can prerender.
async function Responses({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Scoped to the owner, so someone else's form id is a 404 and not a leak.
  const form = await getOwnedForm(userId, id);
  if (!form) notFound();

  const responses = await listResponses(form.id);

  return (
    <ResponsesScreen
      formId={form.id}
      title={form.title}
      description={form.description ?? ""}
      status={form.status}
      acceptResponses={form.acceptResponses}
      fields={form.fields}
      responses={responses}
    />
  );
}
