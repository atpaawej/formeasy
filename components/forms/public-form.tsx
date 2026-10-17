"use client";

import { useActionState } from "react";
import Link from "next/link";

import { FieldRenderer } from "@/components/fields/field-renderer";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SUBMIT_LABEL,
  type Field,
  type FormSettings,
} from "@/lib/fields";
import { submitResponse } from "@/lib/forms/public-actions";
import { INITIAL_SUBMIT_STATE } from "@/lib/forms/submit-state";

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
      className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl leading-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This form has no questions yet.
        </p>
      ) : (
        <div className="flex flex-col gap-7">
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

      {state.formError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {state.formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !accepting}>
          {pending ? "Sending…" : settings.submitLabel || DEFAULT_SUBMIT_LABEL}
        </Button>
        {!accepting ? (
          <span className="text-xs text-muted-foreground">
            This form is no longer accepting responses.
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
