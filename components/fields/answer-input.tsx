"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@/lib/fields";
import { cn } from "@/lib/utils";

export type AnswerValue = string | string[];

type AnswerInputProps = {
  field: Field;
  /** Controlled value. Provide with onValueChange. */
  value?: AnswerValue;
  onValueChange?: (value: AnswerValue) => void;
  /** Uncontrolled starting value, used to re-populate after a failed submit. */
  defaultValue?: AnswerValue;
  disabled?: boolean;
  invalid?: boolean;
};

const ROW_CLASS =
  "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary/60 has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30";

/*
 * The answer control, driven by the field type.
 *
 * Controlled when `onValueChange` is given; otherwise the native input owns the
 * value and a plain <form> submit still carries it. The public form uses the
 * uncontrolled form so that a failed submit re-renders with the answers intact
 * even without JavaScript.
 */
export function AnswerInput({
  field,
  value,
  onValueChange,
  defaultValue,
  disabled,
  invalid,
}: AnswerInputProps) {
  const editable = onValueChange !== undefined;
  const asString = typeof value === "string" ? value : "";
  const asArray = Array.isArray(value) ? value : [];
  const defaultString = typeof defaultValue === "string" ? defaultValue : "";
  const defaultArray = Array.isArray(defaultValue) ? defaultValue : [];

  const shared = {
    name: field.id,
    disabled,
    "aria-invalid": invalid || undefined,
  };

  switch (field.type) {
    case "short_text":
      return (
        <Input
          {...shared}
          type="text"
          placeholder={field.placeholder ?? "Type your answer"}
          {...(editable
            ? {
                value: asString,
                onChange: (event) => onValueChange?.(event.target.value),
              }
            : { defaultValue: defaultString })}
        />
      );

    case "long_text":
      return (
        <Textarea
          {...shared}
          rows={4}
          placeholder={field.placeholder ?? "Type your answer"}
          {...(editable
            ? {
                value: asString,
                onChange: (event) => onValueChange?.(event.target.value),
              }
            : { defaultValue: defaultString })}
        />
      );

    case "number":
      return (
        <Input
          {...shared}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          placeholder="0"
          className="max-w-40"
          {...(editable
            ? {
                value: asString,
                onChange: (event) => onValueChange?.(event.target.value),
              }
            : { defaultValue: defaultString })}
        />
      );

    case "date":
      return (
        <Input
          {...shared}
          type="date"
          className="max-w-48"
          {...(editable
            ? {
                value: asString,
                onChange: (event) => onValueChange?.(event.target.value),
              }
            : { defaultValue: defaultString })}
        />
      );

    case "dropdown":
      return (
        <select
          {...shared}
          className={cn(SELECT_CLASS, "max-w-72", invalid && "border-destructive")}
          {...(editable
            ? {
                value: asString,
                onChange: (event) => onValueChange?.(event.target.value),
              }
            : { defaultValue: defaultString })}
        >
          <option value="">Choose…</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label || "Untitled option"}
            </option>
          ))}
        </select>
      );

    case "single_choice":
      return (
        <div className="flex flex-col gap-2">
          {field.options.map((option) => (
            <label key={option.id} className={ROW_CLASS}>
              <input
                {...shared}
                type="radio"
                value={option.id}
                className="size-4 shrink-0 accent-primary"
                {...(editable
                  ? {
                      checked: asString === option.id,
                      onChange: () => onValueChange?.(option.id),
                    }
                  : { defaultChecked: defaultString === option.id })}
              />
              <span className="min-w-0">{option.label || "Untitled option"}</span>
            </label>
          ))}
        </div>
      );

    case "multi_choice":
      return (
        <div className="flex flex-col gap-2">
          {field.options.map((option) => (
            <label key={option.id} className={ROW_CLASS}>
              <input
                {...shared}
                type="checkbox"
                value={option.id}
                className="size-4 shrink-0 accent-primary"
                {...(editable
                  ? {
                      checked: asArray.includes(option.id),
                      onChange: (event) =>
                        onValueChange?.(
                          event.target.checked
                            ? [...asArray, option.id]
                            : asArray.filter((id) => id !== option.id),
                        ),
                    }
                  : { defaultChecked: defaultArray.includes(option.id) })}
              />
              <span className="min-w-0">{option.label || "Untitled option"}</span>
            </label>
          ))}
        </div>
      );
  }
}
