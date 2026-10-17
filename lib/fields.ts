import { z } from "zod";

import { newFieldId, newOptionId } from "./ids";

/*
 * The field schema is the single source of truth for this product. The builder,
 * the FieldRenderer, and the submit validator all derive from the types below.
 * Adding a field type is one edit here. See AGENTS.md.
 */

export type FieldOption = {
  id: string;
  label: string;
};

type BaseField = {
  id: string;
  label: string;
  required: boolean;
  /** Optional help text shown under the label. */
  description?: string;
};

export type TextField = BaseField & {
  type: "short_text" | "long_text";
  placeholder?: string;
};

export type NumberField = BaseField & {
  type: "number";
  min?: number;
  max?: number;
};

export type DateField = BaseField & {
  type: "date";
};

export type ChoiceField = BaseField & {
  type: "single_choice" | "multi_choice" | "dropdown";
  options: FieldOption[];
};

export type Field = TextField | NumberField | DateField | ChoiceField;

export type FieldType = Field["type"];

/** Answer values, keyed by field id. Choice answers store option ids. */
export type Answers = Record<string, string | string[] | number>;

export type ResponseMeta = {
  userAgent?: string;
  referrer?: string;
  /** Hashed, never the raw address. */
  ipHash?: string;
};

export type FormSettings = {
  submitLabel?: string;
  thankYouTitle?: string;
  thankYouMessage?: string;
};

export const DEFAULT_SUBMIT_LABEL = "Submit";
export const DEFAULT_THANK_YOU_TITLE = "Thanks — that's in.";
export const DEFAULT_THANK_YOU_MESSAGE =
  "Your response was recorded. You can close this tab.";

export const UNTITLED_QUESTION = "Untitled question";

/** Order of the palette in the builder. */
export const FIELD_TYPE_ORDER: FieldType[] = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "dropdown",
  "number",
  "date",
];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Multiple choice",
  multi_choice: "Checkboxes",
  dropdown: "Dropdown",
  number: "Number",
  date: "Date",
};

export function isChoiceField(field: Field): field is ChoiceField {
  return (
    field.type === "single_choice" ||
    field.type === "multi_choice" ||
    field.type === "dropdown"
  );
}

/** A question's display label, falling back for half-written drafts. */
export function fieldLabel(field: Field): string {
  return field.label.trim() || UNTITLED_QUESTION;
}

export function newOption(label = ""): FieldOption {
  return { id: newOptionId(), label };
}

export function newField(type: FieldType): Field {
  const base = { id: newFieldId(), label: "", required: false };
  switch (type) {
    case "short_text":
    case "long_text":
    case "number":
    case "date":
      return { ...base, type };
    case "single_choice":
    case "multi_choice":
    case "dropdown":
      return { ...base, type, options: [newOption(), newOption()] };
  }
}

/**
 * Deep-copies a question with brand new ids. Ids are never reused — a duplicate
 * that shared option ids would make two questions that answer to the same keys.
 */
export function cloneField(field: Field): Field {
  const base = { ...field, id: newFieldId() };
  if (isChoiceField(field)) {
    return {
      ...base,
      options: field.options.map((option) => ({ ...option, id: newOptionId() })),
    } as Field;
  }
  return base as Field;
}

/** The value a respondent's answer starts at. */
export function emptyAnswer(field: Field): string | string[] {
  return field.type === "multi_choice" ? [] : "";
}

export function emptyAnswers(fields: Field[]): Answers {
  const answers: Answers = {};
  for (const field of fields) answers[field.id] = emptyAnswer(field);
  return answers;
}

/*
 * Validation.
 *
 * presentValueSchema validates an answer that is actually there. Required-ness
 * is a separate concern handled by validateAnswers, so the "needs an answer"
 * message is ours rather than zod's generic one.
 */

const REQUIRED_MESSAGE = "This question needs an answer";
const MAX_TEXT_LENGTH = 5000;

function presentValueSchema(field: Field): z.ZodTypeAny {
  switch (field.type) {
    case "short_text":
    case "long_text":
      return z
        .string()
        .max(MAX_TEXT_LENGTH, `Keep it under ${MAX_TEXT_LENGTH} characters`);

    case "number": {
      let schema: z.ZodTypeAny = z
        .string()
        .regex(/^-?\d+(?:\.\d+)?$/, "Enter a number")
        .transform((value) => Number(value));

      const { min, max } = field;
      if (min !== undefined || max !== undefined) {
        schema = schema.refine(
          (value) => {
            const n = value as number;
            return (
              (min === undefined || n >= min) && (max === undefined || n <= max)
            );
          },
          min !== undefined && max !== undefined
            ? `Enter a number from ${min} to ${max}`
            : min !== undefined
              ? `Enter a number that is ${min} or more`
              : `Enter a number that is ${max} or less`,
        );
      }
      return schema;
    }

    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date");

    case "single_choice":
    case "dropdown": {
      const ids = new Set(field.options.map((option) => option.id));
      return z.string().refine((value) => ids.has(value), "Pick one of the options");
    }

    case "multi_choice": {
      const ids = new Set(field.options.map((option) => option.id));
      return z
        .array(z.string())
        .refine(
          (values) => values.every((value) => ids.has(value)),
          "Pick from the options",
        );
    }
  }
}

/**
 * Composed schema for a full set of present answers. Kept as the reusable
 * definition of "a valid body of answers" — the submit route and any future
 * CSV import go through validateAnswers, which builds on this.
 */
export function fieldsToZod(fields: Field[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const schema = presentValueSchema(field);
    shape[field.id] = field.required ? schema : schema.optional();
  }
  return z.object(shape);
}

/**
 * Turn raw form values into the shape validateAnswers expects: trimmed strings,
 * arrays for multi-choice, and absent for anything empty.
 */
function normalizeRaw(
  fields: Field[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const field of fields) {
    const value = raw[field.id];

    if (field.type === "multi_choice") {
      const list = Array.isArray(value) ? value : value == null ? [] : [value];
      const cleaned = list.filter(
        (item): item is string => typeof item === "string" && item.trim() !== "",
      );
      if (cleaned.length > 0) out[field.id] = cleaned;
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") out[field.id] = trimmed;
      continue;
    }

    if (value !== undefined && value !== null) out[field.id] = value;
  }

  return out;
}

export type ValidationResult = {
  answers: Answers;
  /** Field id to message. Empty means valid. */
  errors: Record<string, string>;
};

export function validateAnswers(
  fields: Field[],
  raw: Record<string, unknown>,
): ValidationResult {
  const normalized = normalizeRaw(fields, raw);
  const errors: Record<string, string> = {};
  const present: Record<string, unknown> = {};

  for (const field of fields) {
    const value = normalized[field.id];
    if (value === undefined) {
      if (field.required) errors[field.id] = REQUIRED_MESSAGE;
      continue;
    }
    present[field.id] = value;
  }

  const result = fieldsToZod(fields).safeParse(present);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }

  return {
    answers: (result.success ? result.data : {}) as Answers,
    errors,
  };
}

/** Problems that block publishing. Empty means the form is publishable. */
export function validateFormForPublish(fields: Field[]): string[] {
  const problems: string[] = [];

  if (fields.length === 0) {
    problems.push("Add at least one question before publishing.");
  }

  for (const field of fields) {
    if (!field.label.trim()) {
      problems.push("Every question needs a label.");
    }
    if (isChoiceField(field)) {
      const filled = field.options.filter((option) => option.label.trim());
      if (filled.length < 2) {
        problems.push("Choice questions need at least two options.");
      }
    }
  }

  return [...new Set(problems)];
}

/*
 * Runtime parsers. The server never trusts a client payload, so anything coming
 * back from the builder's autosave goes through parseFields first.
 */

// Ids are answer keys. A blank one is never legitimate, and `.min(1)` alone
// would accept a single space.
const idSchema = z.string().trim().min(1);

const fieldOptionSchema = z.object({
  id: idSchema,
  label: z.string(),
});

const baseFieldShape = {
  id: idSchema,
  label: z.string(),
  required: z.boolean(),
  description: z.string().optional(),
};

const fieldSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseFieldShape,
    type: z.literal("short_text"),
    placeholder: z.string().optional(),
  }),
  z.object({
    ...baseFieldShape,
    type: z.literal("long_text"),
    placeholder: z.string().optional(),
  }),
  z.object({
    ...baseFieldShape,
    type: z.literal("number"),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({ ...baseFieldShape, type: z.literal("date") }),
  z.object({
    ...baseFieldShape,
    type: z.literal("single_choice"),
    options: z.array(fieldOptionSchema),
  }),
  z.object({
    ...baseFieldShape,
    type: z.literal("multi_choice"),
    options: z.array(fieldOptionSchema),
  }),
  z.object({
    ...baseFieldShape,
    type: z.literal("dropdown"),
    options: z.array(fieldOptionSchema),
  }),
]);

/** Returns null when the payload is not a well-formed field list. */
export function parseFields(value: unknown): Field[] | null {
  const result = z.array(fieldSchema).safeParse(value);
  if (!result.success) return null;
  return result.data as Field[];
}

const formSettingsSchema = z.object({
  submitLabel: z.string().optional(),
  thankYouTitle: z.string().optional(),
  thankYouMessage: z.string().optional(),
});

export function parseFormSettings(value: unknown): FormSettings {
  const result = formSettingsSchema.safeParse(value);
  return result.success ? result.data : {};
}
