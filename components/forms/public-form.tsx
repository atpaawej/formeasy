"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { FieldRenderer } from "@/components/fields/field-renderer";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SUBMIT_LABEL,
  type Field,
  type FormSettings,
} from "@/lib/fields";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";
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
  const formRef = useRef<HTMLFormElement>(null);

  /*
   * A failed submit comes back with the cursor where it was — usually on the
   * submit button, at the bottom, with the first problem somewhere above it off
   * screen. Moving focus to that question says where the problem is, and puts a
   * keyboard user at the first thing to fix rather than back at the start of the
   * form. The error text is announced by the field, not by this.
   */
  useEffect(() => {
    const firstInvalid = fields.find((field) => state.errors[field.id]);
    if (!firstInvalid) return;
    focusField(formRef.current, firstInvalid.id);
  }, [state, fields]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="rise-in relative flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <Honeypot />

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
          /* `role="alert"`: this one has no field to carry it, and it can arrive
             after a wait — nothing else on screen would say it happened. */
          <motion.p
            key={state.formError}
            role="alert"
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

/**
 * The honeypot: a field a person cannot see, reach by keyboard, or hear from a
 * screen reader, and a bot fills without thinking. It is planted in the form
 * rather than the form being shaped around it, and it submits with the answers
 * even when the script never runs — the server is what reads it. See
 * lib/forms/honeypot.ts.
 *
 * Off screen rather than `display: none`, because the bots worth stopping are
 * the ones that skip what is hidden but answer what the parser can see.
 */
function Honeypot() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -top-px left-[-9999px] h-px w-px overflow-hidden"
    >
      <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
      <input
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}

/**
 * Put the cursor on the control for a field. A radio group is a list of
 * controls, so it gets its first — the group has no focusable parent.
 */
function focusField(form: HTMLFormElement | null, fieldId: string) {
  const control = form?.elements.namedItem(fieldId);
  if (control instanceof RadioNodeList) {
    const first = control.item(0);
    if (first instanceof HTMLElement) first.focus();
    return;
  }
  if (control instanceof HTMLElement) control.focus();
}
