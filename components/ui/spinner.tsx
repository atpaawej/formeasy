import { cn } from "@/lib/utils";

/*
 * An indeterminate progress ring: a faint track with a brighter arc riding it.
 * Rotation is a CSS animation rather than a JS one so it keeps turning even for
 * someone who has asked for reduced motion — a frozen spinner reads as a frozen
 * page, which is worse than the motion it is trying to avoid.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("size-4 shrink-0 animate-spin", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
