import { Suspense } from "react";

import { PageTransition } from "@/components/page-transition";
import { CreateFormButton } from "@/components/forms/create-form-button";
import {
  FormsSection,
  FormsSectionSkeleton,
} from "@/components/forms/forms-section";

export const metadata = { title: "Your forms" };

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-medium tracking-tight">Your forms</h1>
          <CreateFormButton />
        </div>
        <Suspense fallback={<FormsSectionSkeleton />}>
          <FormsSection />
        </Suspense>
      </div>
    </PageTransition>
  );
}
