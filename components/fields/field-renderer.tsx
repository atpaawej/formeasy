"use client";

import { useEffect, useRef } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { motion } from "motion/react";

import {
  AnswerInput,
  type AnswerValue,
} from "@/components/fields/answer-input";
import { Button } from "@/components/ui/button";
import { fieldLabel, isChoiceField, newOption, type Field } from "@/lib/fields";
import { enter } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * One renderer, two modes.
 *
 * The builder renders this with mode="edit" and the public form with
 * mode="preview". Both branches keep the label block and the control in the same
 * geometry, so a question looks the same while you write it and while someone
 * answers it. See AGENTS.md.
 */

export type FieldRendererProps = {
  field: Field;
  mode: "preview" | "edit";
  /** preview only */
  value?: AnswerValue;
  onValueChange?: (value: AnswerValue) => void;
  defaultValue?: AnswerValue;
  error?: string;
  disabled?: boolean;
  /** edit only */
  onFieldChange?: (field: Field) => void;
  /**
   * edit only — put the cursor in the label. Set for a question the builder has
   * just added, so adding one lands you in it rather than on a card to hunt
   * through.
   */
  autoFocusLabel?: boolean;
  /** edit only — called once the cursor has landed, to clear that request. */
  onAutoFocusHandled?: () => void;
};

export function FieldRenderer(props: FieldRendererProps) {
  return props.mode === "edit" ? (
    <EditField {...props} />
  ) : (
    <PreviewField {...props} />
  );
}

const INLINE_INPUT =
  "w-full rounded-md border-0 bg-transparent px-0 outline-none transition-shadow placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/40";

function PreviewField({
  field,
  value,
  onValueChange,
  defaultValue,
  error,
  disabled,
}: FieldRendererProps) {
  // The message is part of the field: named once, referenced by the control it
  // belongs to, so a screen reader reads the problem with the question.
  const errorId = `${field.id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <QuestionHeading field={field} />
      <AnswerInput
        field={field}
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        disabled={disabled}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
      />
      {/* Remounts on a new message, so the error lands instead of silently
          replacing the previous one. */}
      {error ? (
        <motion.p
          key={error}
          id={errorId}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enter}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      ) : null}
    </div>
  );
}

function QuestionHeading({ field }: { field: Field }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-base leading-snug text-pretty">
          {fieldLabel(field)}
        </span>
        {field.required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </div>
      {field.description ? (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      ) : null}
    </div>
  );
}

function EditField({
  field,
  onFieldChange,
  autoFocusLabel,
  onAutoFocusHandled,
}: FieldRendererProps) {
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocusLabel) return;
    labelRef.current?.focus();
    onAutoFocusHandled?.();
  }, [autoFocusLabel, onAutoFocusHandled]);

  const update = (patch: Partial<Field>) => {
    onFieldChange?.({ ...field, ...patch } as Field);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <input
          ref={labelRef}
          value={field.label}
          onChange={(event) => update({ label: event.target.value })}
          placeholder="Untitled question"
          aria-label="Question label"
          className={cn(INLINE_INPUT, "py-1 font-serif text-base leading-snug")}
        />
        <input
          value={field.description ?? ""}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Add a description (optional)"
          aria-label="Question description"
          className={cn(INLINE_INPUT, "py-0.5 text-xs text-muted-foreground")}
        />
      </div>

      {isChoiceField(field) ? (
        <ChoiceOptionsEditor field={field} update={update} />
      ) : (
        <AnswerInput field={field} disabled />
      )}
    </div>
  );
}

function ChoiceOptionsEditor({
  field,
  update,
}: {
  field: Extract<Field, { options: unknown }>;
  update: (patch: Partial<Field>) => void;
}) {
  const square = field.type === "multi_choice";
  /*
   * The id of an option that was just added and has not been focused yet. The
   * input reads it the moment it mounts — a ref callback rather than an effect,
   * because the input does not exist until this same render commits.
   */
  const pendingFocus = useRef<string | null>(null);

  const setLabel = (optionId: string, label: string) => {
    update({
      options: field.options.map((option) =>
        option.id === optionId ? { ...option, label } : option,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {field.options.map((option, index) => (
        <div key={option.id} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 border border-foreground/25",
              square ? "rounded-[4px]" : "rounded-full",
            )}
          />
          <input
            ref={(element) => {
              if (element && pendingFocus.current === option.id) {
                pendingFocus.current = null;
                element.focus();
              }
            }}
            value={option.label}
            onChange={(event) => setLabel(option.id, event.target.value)}
            placeholder={`Option ${index + 1}`}
            aria-label={`Option ${index + 1}`}
            className={cn(INLINE_INPUT, "py-1.5 text-sm")}
          />
          {field.options.length > 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove option ${index + 1}`}
              onClick={() =>
                update({
                  options: field.options.filter((o) => o.id !== option.id),
                })
              }
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => {
          const option = newOption();
          pendingFocus.current = option.id;
          update({ options: [...field.options, option] });
        }}
      >
        <PlusIcon />
        Add option
      </Button>
    </div>
  );
}
