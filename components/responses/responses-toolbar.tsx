"use client";

import { useTransition } from "react";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Switch } from "@/components/ui/switch";
import { setAcceptResponses } from "@/lib/forms/actions";
import type { FormStatus } from "@/lib/forms/status";
import { cn } from "@/lib/utils";

/*
 * Export, and the open/closed switch.
 *
 * The switch is controlled by the server's `status`, not by local state: the
 * action revalidates this path, so the same response that writes the row sends
 * back the new value and the switch moves once. One source of truth, no
 * optimistic value to reconcile, and no flicker back if a refresh is slow.
 *
 * `accept_responses` is the only thing it writes. A closed form keeps its public
 * link and stays readable; it simply stops taking answers.
 */
export function ResponsesToolbar({
  formId,
  status,
  responseCount,
}: {
  formId: string;
  status: FormStatus;
  responseCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const accepting = status !== "closed";

  function toggle(next: boolean) {
    startTransition(async () => {
      await setAcceptResponses(formId, next);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {status !== "draft" ? (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-full border border-border px-3.5 py-1.5 text-sm transition-opacity",
            pending && "opacity-60",
          )}
        >
          <Switch
            size="sm"
            checked={accepting}
            disabled={pending}
            onCheckedChange={toggle}
            aria-label="Accept responses"
          />
          <span
            className={cn(
              "transition-colors",
              accepting ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {accepting ? "Accepting responses" : "No longer accepting"}
          </span>
        </div>
      ) : null}

      {responseCount === 0 ? (
        <Button variant="outline" size="sm" disabled>
          <DownloadIcon />
          Export CSV
        </Button>
      ) : (
        // A real <a>, not a Button with an anchor inside it: a download is a
        // navigation, so it keeps link semantics (and never becomes a
        // `role="button"`). It wears the button's classes instead.
        <a
          href={`/api/forms/${formId}/export`}
          download
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <DownloadIcon />
          Export CSV
        </a>
      )}
    </div>
  );
}
