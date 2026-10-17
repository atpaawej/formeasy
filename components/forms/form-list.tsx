"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { StatusPill } from "@/components/forms/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { FormSummary } from "@/lib/forms/queries";
import { formStatus } from "@/lib/forms/status";
import { stagger } from "@/lib/motion";

/*
 * The list of your forms.
 *
 * Each row has two destinations and no third: the row itself opens the builder,
 * and the response count opens the responses. They are separate links rather
 * than one nested inside the other, which is invalid HTML and unreachable by
 * keyboard.
 */
export function FormList({ forms }: { forms: FormSummary[] }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-card">
      {forms.map((form, index) => (
        <FormRow key={form.id} form={form} index={index} />
      ))}
    </ul>
  );
}

function FormRow({ form, index }: { form: FormSummary; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={stagger(index)}
      className="relative border-b border-border transition-colors last:border-b-0 hover:bg-muted/60"
    >
      {/* Covers the whole row, so a click anywhere opens the builder. */}
      <Link
        href={`/dashboard/forms/${form.id}/edit`}
        aria-label={`Edit ${form.title}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset"
      />

      <div className="flex items-center gap-6 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{form.title}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <StatusPill status={formStatus(form.status, form.acceptResponses)} />
            <span>Updated {formatDate(form.updatedAt)}</span>
          </div>
        </div>

        <Link
          href={`/dashboard/forms/${form.id}`}
          className="relative rounded-lg px-2.5 py-1 text-right transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="block text-sm tabular-nums">
            {form.responseCount}
          </span>
          <span className="block text-xs text-muted-foreground">
            {form.responseCount === 1 ? "response" : "responses"}
          </span>
        </Link>
      </div>
    </motion.li>
  );
}

export function FormListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-6 border-b border-border px-5 py-4 last:border-b-0"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-14" />
        </div>
      ))}
    </div>
  );
}
