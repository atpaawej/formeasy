import { Suspense } from "react";

import { CreateFormButton } from "@/components/forms/create-form-button";
import {
  FormsSection,
  FormsSectionSkeleton,
} from "@/components/forms/forms-section";

export const metadata = { title: "Your forms" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-medium tracking-tight">Your forms</h1>
        <CreateFormButton />
      </div>
      <Suspense fallback={<FormsSectionSkeleton />}>
        <FormsSection />
      </Suspense>
    </div>
  );
}
