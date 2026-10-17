"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDownIcon } from "lucide-react";

import type { Field } from "@/lib/fields";
import { formatDateTime } from "@/lib/format";
import { displayAnswers } from "@/lib/forms/answers";
import type { ResponseRow } from "@/lib/forms/queries";
import { enter, panel, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * The responses list: newest first, one collapsible row each.
 *
 * Rows start closed and show a preview, so a hundred responses stay scannable.
 * Opening one is a real expand — the row grows, its neighbours are pushed by a
 * position animation rather than jumping — and the answers inside are the same
 * values the CSV writes, resolved by the same module.
 */
export function ResponseList({
  fields,
  responses,
}: {
  fields: Field[];
  responses: ResponseRow[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const total = responses.length;

  return (
    <ul className="flex flex-col gap-2.5">
      {responses.map((response, index) => (
        <ResponseItem
          key={response.id}
          fields={fields}
          response={response}
          position={total - index}
          index={index}
          open={openId === response.id}
          onToggle={() =>
            setOpenId((current) =>
              current === response.id ? null : response.id,
            )
          }
        />
      ))}
    </ul>
  );
}

function ResponseItem({
  fields,
  response,
  position,
  index,
  open,
  onToggle,
}: {
  fields: Field[];
  response: ResponseRow;
  /** 1-based arrival order, so the newest response carries the highest number. */
  position: number;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const answers = displayAnswers(fields, response.answers);
  const firstFilled = answers.find((answer) => answer.values.length > 0);
  const preview = firstFilled
    ? firstFilled.values.join(", ")
    : "No answers given";

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={stagger(index)}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset"
      >
        <span className="w-8 shrink-0 text-xs text-muted-foreground tabular-nums">
          #{position}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm text-pretty">
          {preview}
        </span>

        <time
          dateTime={response.submittedAt.toISOString()}
          className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block"
        >
          {formatDateTime(response.submittedAt)}
        </time>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={enter}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDownIcon className="size-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={panel}
            className="overflow-hidden"
          >
            <dl className="flex flex-col gap-5 border-t border-border px-5 py-5">
              <time
                dateTime={response.submittedAt.toISOString()}
                className="text-xs text-muted-foreground tabular-nums sm:hidden"
              >
                {formatDateTime(response.submittedAt)}
              </time>

              {answers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This response has no answers.
                </p>
              ) : (
                answers.map((answer) => (
                  <div key={answer.fieldId} className="flex flex-col gap-1.5">
                    <dt className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {answer.label}
                      {answer.orphan ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem]">
                          Deleted question
                        </span>
                      ) : null}
                    </dt>
                    <dd
                      className={cn(
                        "text-sm leading-relaxed text-pretty",
                        answer.orphan && "text-muted-foreground",
                      )}
                    >
                      {answer.values.join(", ")}
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
