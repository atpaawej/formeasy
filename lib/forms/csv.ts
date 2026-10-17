import { fieldLabel, type Answers, type Field } from "@/lib/fields";
import { answerToCell, formatAnswerValues, orphanFieldIds } from "./answers";

/*
 * CSV export. Pure, so the exact bytes are pinned by tests.
 *
 * Shape: a "Submitted at" column (ISO 8601, UTC — sorts as text, parses as a
 * date), then one column per question in form order, then one column per
 * deleted question (headed with its id). See docs/design.md.
 */

export const CSV_MIME = "text/csv; charset=utf-8";

export type CsvResponse = {
  submittedAt: Date;
  answers: Answers;
};

/**
 * RFC 4180 quoting: a value is wrapped in double quotes only when it contains a
 * comma, a quote, a CR or an LF, and embedded quotes are doubled.
 */
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Oldest first, so a spreadsheet reads as a timeline. */
function inSubmissionOrder(responses: CsvResponse[]): CsvResponse[] {
  return [...responses].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
  );
}

export function buildCsv(fields: Field[], responses: CsvResponse[]): string {
  const rows = inSubmissionOrder(responses);
  const orphans = orphanFieldIds(fields, rows);

  const header = [
    "Submitted at",
    ...fields.map(fieldLabel),
    ...orphans,
  ];

  const lines = [header.map(csvEscape).join(",")];

  for (const response of rows) {
    const cells = [
      response.submittedAt.toISOString(),
      ...fields.map((field) =>
        answerToCell(formatAnswerValues(field, response.answers[field.id])),
      ),
      ...orphans.map((fieldId) =>
        answerToCell(formatAnswerValues(null, response.answers[fieldId])),
      ),
    ];
    lines.push(cells.map(csvEscape).join(","));
  }

  // CRLF per RFC 4180, trailing newline included.
  return `${lines.join("\r\n")}\r\n`;
}

/** A readable download name: "Team offsite" → "team-offsite.csv". */
export function csvFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  return `${slug || "form"}.csv`;
}
