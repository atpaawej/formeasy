"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeftIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { glide } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * The form's two sections, as a segmented control.
 *
 * It lives in the form's layout, so it survives a move between Questions and
 * Responses. That is what lets the active pill slide from one tab to the other
 * instead of blinking out and back in — the one piece of motion in the app that
 * says "same place, different view". See docs/design-system.md.
 */

const TABS = [
  { key: "questions", label: "Questions" },
  { key: "responses", label: "Responses" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FormNav({ formId }: { formId: string }) {
  const pathname = usePathname();
  const active: TabKey = pathname.endsWith("/edit") ? "questions" : "responses";

  function hrefFor(key: TabKey) {
    return key === "questions"
      ? `/dashboard/forms/${formId}/edit`
      : `/dashboard/forms/${formId}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Your forms
      </Link>

      <nav
        aria-label="Form sections"
        className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5"
      >
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={hrefFor(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-sm transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="form-nav-active"
                  className="absolute inset-0 rounded-full bg-secondary"
                  transition={glide}
                />
              ) : null}
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Matches the nav's height, so the tab row does not jump when it streams in. */
export function FormNavSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-9 w-52 rounded-full" />
    </div>
  );
}
