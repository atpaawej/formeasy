import { cn } from "@/lib/utils";

/*
 * The hero visual: not a screenshot, but a question — the most characteristic
 * thing in this product's world, set the way the app sets it. It is the same
 * thing the public form shows a respondent, which is the honest advert.
 */

const OPTIONS = ["Cleaner exports", "Branching logic", "File uploads"];

export function FormPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="font-serif text-xl leading-snug">
        What should we build next?
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your answer shapes the roadmap.
      </p>

      <div className="mt-6 space-y-2">
        {OPTIONS.map((option, index) => (
          <div
            key={option}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
              index === 0 ? "border-primary/40 bg-primary/5" : "border-border",
            )}
          >
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                index === 0 ? "border-primary" : "border-muted-foreground/40",
              )}
            >
              {index === 0 && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span>{option}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
        Send
      </div>
    </div>
  );
}
