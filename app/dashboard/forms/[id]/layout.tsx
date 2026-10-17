import { Suspense } from "react";

import { FormNav, FormNavSkeleton } from "@/components/forms/form-nav";

/*
 * Shared chrome for one form: the section nav, which sits above both the builder
 * and the responses view. It is deliberately *not* in the page, because a layout
 * survives a move between the two sections — and that is what lets the active
 * tab pill slide across instead of blinking out and back in.
 *
 * `params` is a promise and dynamic route data, so it is awaited inside the
 * Suspense boundary below. The rest of the tree still prerenders.
 */
export default function FormLayout({
  children,
  params,
}: LayoutProps<"/dashboard/forms/[id]">) {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<FormNavSkeleton />}>
        {params.then(({ id }) => (
          <FormNav formId={id} />
        ))}
      </Suspense>
      {children}
    </div>
  );
}
