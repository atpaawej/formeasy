import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import type { FormSummary } from "@/lib/forms/queries";
import { FORM_STATUS_LABEL, formStatus } from "@/lib/forms/status";
import { cn } from "@/lib/utils";

export function FormList({ forms }: { forms: FormSummary[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {forms.map((form) => (
        <li key={form.id}>
          <Link
            href={`/dashboard/forms/${form.id}/edit`}
            className="flex items-center gap-6 px-4 py-3.5 transition-colors hover:bg-muted/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{form.title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusPill
                  status={formStatus(form.status, form.acceptResponses)}
                />
                <span>Updated {formatDate(form.updatedAt)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm tabular-nums">{form.responseCount}</p>
              <p className="text-xs text-muted-foreground">
                {form.responseCount === 1 ? "response" : "responses"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusPill({
  status,
}: {
  status: ReturnType<typeof formStatus>;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "published" && "bg-primary",
          status === "closed" && "bg-muted-foreground",
          status === "draft" && "bg-border",
        )}
      />
      {FORM_STATUS_LABEL[status]}
    </span>
  );
}

export function FormListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-6 border-b border-border px-4 py-3.5 last:border-b-0"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}
