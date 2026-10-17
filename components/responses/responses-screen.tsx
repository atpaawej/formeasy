"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { CopyLinkButton } from "@/components/forms/copy-link-button";
import { StatusPill } from "@/components/forms/status-pill";
import { ResponseList } from "@/components/responses/response-list";
import { ResponsesToolbar } from "@/components/responses/responses-toolbar";
import { buttonVariants } from "@/components/ui/button-variants";
import type { Field } from "@/lib/fields";
import type { ResponseRow } from "@/lib/forms/queries";
import { formStatus, type FormStatus } from "@/lib/forms/status";
import { enter, riseIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * The responses view: what came in, how to get it out, and whether the form is
 * still open.
 */
export function ResponsesScreen({
  formId,
  title,
  description,
  status,
  acceptResponses,
  fields,
  responses,
}: {
  formId: string;
  title: string;
  description: string;
  status: string;
  acceptResponses: boolean;
  fields: Field[];
  responses: ResponseRow[];
}) {
  const view = formStatus(status, acceptResponses);
  const count = responses.length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-serif text-2xl leading-tight text-balance">
            {title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <StatusPill status={view} />
            <span>{count === 1 ? "1 response" : `${count} responses`}</span>
          </p>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <ResponsesToolbar
          formId={formId}
          status={view}
          responseCount={count}
        />
      </header>

      {count === 0 ? (
        <EmptyResponses formId={formId} status={view} />
      ) : (
        <ResponseList fields={fields} responses={responses} />
      )}
    </div>
  );
}

/** An empty screen is an invitation, not a shrug. */
function EmptyResponses({
  formId,
  status,
}: {
  formId: string;
  status: FormStatus;
}) {
  const draft = status === "draft";

  return (
    <motion.div
      initial={riseIn.initial}
      animate={riseIn.animate}
      transition={enter}
      className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border px-6 py-20 text-center"
    >
      <p className="font-serif text-lg">
        {draft ? "Not published yet." : "No responses yet."}
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {draft
          ? "Publish the form and its link starts collecting answers. They will appear here, newest first."
          : "Share the link and answers will appear here, newest first. Export them as a spreadsheet whenever you like."}
      </p>
      {draft ? (
        <Link
          href={`/dashboard/forms/${formId}/edit`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Go to questions
        </Link>
      ) : (
        <CopyLinkButton formId={formId} />
      )}
    </motion.div>
  );
}
