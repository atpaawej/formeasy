import { FORM_STATUS_LABEL, type FormStatus } from "@/lib/forms/status";
import { cn } from "@/lib/utils";

/*
 * A form's state as a dot and a word. One component, so the dashboard list and
 * the responses header can never describe the same form differently.
 */
export function StatusPill({
  status,
  className,
}: {
  status: FormStatus;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
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
