import type { ReactNode } from "react";
import { TriangleAlertIcon } from "lucide-react";

/**
 * A failure or a missing page, presented the way an empty state is: a dashed
 * panel, a serif line, a plain sentence, and a way out. Same shape everywhere, so
 * "something went wrong" never arrives as a stack trace, a browser error page, or
 * a blank screen.
 *
 * Two tones, because a 404 is not an error. `error` carries the alert mark and is
 * for something that failed; `neutral` is for something that simply is not there,
 * and reads like the app's other empty states.
 *
 * The copy says what it honestly can and no more: no error code to quote, no
 * technical cause. The cause is in the logs; the person reading this can only be
 * helped by knowing whether to try again.
 */
export function ErrorState({
  title,
  message,
  actions,
  tone = "error",
}: {
  title: string;
  message: string;
  actions?: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      {tone === "error" ? (
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive"
        >
          <TriangleAlertIcon className="size-5" />
        </span>
      ) : null}
      <p className="font-serif text-lg leading-snug text-balance">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
