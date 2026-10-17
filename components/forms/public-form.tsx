"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { FieldRenderer } from "@/components/fields/field-renderer";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SUBMIT_LABEL,
  type Field,
  type FormSettings,
} from "@/lib/fields";
import { submitResponse } from "@/lib/forms/public-actions";
import { INITIAL_SUBMIT_STATE } from "@/lib/forms/submit-state";
import { panel } from "@/lib/motion";

/*
 * The answers are uncontrolled on purpose. A failed validation re-renders this
 * component, and because the inputs were never controlled, what the respondent
 * typed is still there — errors appear without wiping the form.
 */
export function PublicForm({
  formId,
  title,
  description,
  fields,
  settings,
  accepting,
}: {
  formId: string;
  title: string;
  description: string;
  fields: Field[];
  settings: FormSettings;
  accepting: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    submitResponse.bind(null, formId),
    INITIAL_SUBMIT_STATE,
  );

  return (
    <form
      action={formAction}
      noValidate
      className="rise-in flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <header className="flex flex-col gap-2.5">
        <h1 className="font-serif text-2xl leading-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>

      {!accepting ? (
        <p className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          This form is closed. You can still read the questions, but it is no
          longer accepting responses.
        </p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This form has no questions yet.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {fields.map((field) => (
            <FieldRenderer
              key={field.id}
              mode="preview"
              field={field}
              defaultValue={state.values?.[field.id]}
              error={state.errors[field.id]}
              disabled={!accepting}
            />
          ))}
        </div>
      )}

      <AnimatePresence initial={false}>
        {state.formError ? (
          <motion.p
            key={state.formError}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={panel}
            className="overflow-hidden text-sm text-destructive"
          >
            <span className="block rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
              {state.formError}
            </span>
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} disabled={!accepting}>
          {settings.submitLabel || DEFAULT_SUBMIT_LABEL}
        </Button>
        {!accepting ? (
          <span className="text-xs text-muted-foreground">
            Responses are closed.
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function PublicFormFooter() {
  return (
    <p className="text-xs text-muted-foreground">
      Made with{" "}
      <Link
        href="/"
        className="underline underline-offset-2 transition-colors hover:text-foreground"
      >
        formeasy
      </Link>
    </p>
  );
}
