import type { Form } from "@/lib/db/schema";
import type { Field } from "@/lib/fields";
import { displayAnswers } from "@/lib/forms/answers";
import type { FormSummary, ResponseRow } from "@/lib/forms/queries";

/*
 * What an agent sees. Pure, and the only place the JSON shape is decided, so a
 * route handler is plumbing and the same form looks the same from every endpoint.
 *
 * Two rules, both inherited from the human-facing side:
 *
 * - Answers are formatted by `lib/forms/answers.ts`, the one formatter the
 *   responses list and the CSV also use — so the API cannot disagree with the
 *   screen about what an answer says. The raw stored values ride along under
 *   `answers` for anything that wants the ids.
 * - A question that was deleted still shows, labelled by its raw field id, rather
 *   than being dropped.
 *
 * Times are ISO 8601, UTC — the same clock the CSV uses.
 */

export function formSummaryPayload(form: FormSummary) {
  return {
    id: form.id,
    title: form.title,
    status: form.status,
    acceptResponses: form.acceptResponses,
    responseCount: form.responseCount,
    updatedAt: form.updatedAt.toISOString(),
    publicPath: `/f/${form.id}`,
  };
}

export function formPayload(form: Form) {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    status: form.status,
    acceptResponses: form.acceptResponses,
    fields: form.fields,
    settings: form.settings,
    publicPath: `/f/${form.id}`,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}

export function responsePayload(fields: Field[], row: ResponseRow) {
  return {
    id: row.id,
    submittedAt: row.submittedAt.toISOString(),
    /** Stored values, keyed by field id — option ids, not labels. */
    answers: row.answers,
    /** The same answers as a person reads them: labels, in question order. */
    display: displayAnswers(fields, row.answers),
  };
}
