import { createHash } from "node:crypto";

import type { Field } from "@/lib/fields";

/*
 * Pure pieces of the submit path. Keeping the decisions here (rather than in the
 * server action) is what makes them testable without a request or a database.
 */

/** The gate: a form takes responses only when it is published and still open. */
export function canAcceptResponses(form: {
  status: string;
  acceptResponses: boolean;
}): boolean {
  return form.status === "published" && form.acceptResponses;
}

/**
 * Pull the raw submitted values for a form's fields out of a FormData.
 *
 * Multi-choice collapses to an array of option ids; a field the respondent left
 * empty is omitted entirely. These values are both what gets validated and what
 * gets echoed back to re-populate the form after a failure.
 */
export function readAnswersFromFormData(
  fields: Field[],
  formData: FormData,
): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};

  for (const field of fields) {
    // Empty, not trimmed: an echo should show exactly what was typed.
    const submitted = formData
      .getAll(field.id)
      .filter((entry): entry is string => typeof entry === "string" && entry !== "");
    if (submitted.length === 0) continue;
    values[field.id] = field.type === "multi_choice" ? submitted : submitted[0];
  }

  return values;
}

/** Salted: an unsalted hash of an IPv4 address is a 2^32 lookup from the address. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
