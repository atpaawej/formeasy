import { fieldLabel, isChoiceField, type Answers, type Field } from "@/lib/fields";

/*
 * Turning stored answers into something a person can read.
 *
 * The responses list and the CSV export both go through here, so the two can
 * never disagree about what an answer says. Everything is pure: no database, no
 * request, so the formats are pinned by tests.
 *
 * Two kinds of leftovers are surfaced rather than dropped (see docs/design.md):
 *
 * - an answer keyed by a field id that is no longer on the form (the question
 *   was deleted) becomes an "orphan" — its own column in the CSV, its own row
 *   in the list, labelled by the id because that is all that is left;
 * - an answer naming an option id that is no longer on the question renders as
 *   the option id itself. Renaming an option is free; deleting one leaves the
 *   old answers pointing at an id with no label.
 */

export type DisplayAnswer = {
  fieldId: string;
  /** The question's label; the raw field id when the question was deleted. */
  label: string;
  /** Values resolved to labels, ready to render. Never empty for a present answer. */
  values: string[];
  /** True when the answer belongs to a question that is no longer on the form. */
  orphan: boolean;
};

function optionLabel(field: Field, optionId: string): string {
  if (!isChoiceField(field)) return optionId;
  const option = field.options.find((candidate) => candidate.id === optionId);
  // A missing or label-less option falls back to the id: something is better
  // than a blank cell, and it is never mistaken for a real label.
  return option?.label.trim() || optionId;
}

/**
 * The display values for one answer. `field` is null when the question is gone,
 * in which case the stored value is shown as-is.
 */
export function formatAnswerValues(
  field: Field | null,
  value: unknown,
): string[] {
  if (value === undefined || value === null) return [];

  if (Array.isArray(value)) {
    return value.map((item) =>
      field ? optionLabel(field, String(item)) : String(item),
    );
  }

  if (field && (field.type === "single_choice" || field.type === "dropdown")) {
    return [optionLabel(field, String(value))];
  }

  return [String(value)];
}

/** Answer values joined for a single cell: multi-choice reads as a list. */
export function answerToCell(value: string[]): string {
  return value.join("; ");
}

/** A response's answers in question order, with orphans last. */
export function displayAnswers(
  fields: Field[],
  answers: Answers,
): DisplayAnswer[] {
  const known = new Set(fields.map((field) => field.id));

  const present = fields
    .filter((field) => answers[field.id] !== undefined)
    .map((field) => ({
      fieldId: field.id,
      label: fieldLabel(field),
      values: formatAnswerValues(field, answers[field.id]),
      orphan: false,
    }));

  const orphans = Object.keys(answers)
    .filter((fieldId) => !known.has(fieldId))
    .map((fieldId) => ({
      fieldId,
      label: fieldId,
      values: formatAnswerValues(null, answers[fieldId]),
      orphan: true,
    }));

  return [...present, ...orphans];
}

/**
 * Field ids that appear in answers but not on the form, in the order they are
 * first seen. These become the extra CSV columns after the real questions.
 */
export function orphanFieldIds(
  fields: Field[],
  responses: { answers: Answers }[],
): string[] {
  const known = new Set(fields.map((field) => field.id));
  const seen = new Set<string>();
  const orphans: string[] = [];

  for (const response of responses) {
    for (const fieldId of Object.keys(response.answers)) {
      if (known.has(fieldId) || seen.has(fieldId)) continue;
      seen.add(fieldId);
      orphans.push(fieldId);
    }
  }

  return orphans;
}
