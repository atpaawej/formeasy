import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/fields";
import { buildCsv, csvEscape, csvFilename } from "./csv";

const fields: Field[] = [
  { id: "q1", type: "short_text", label: "Name", required: true },
  {
    id: "q2",
    type: "multi_choice",
    label: "Sessions",
    required: false,
    options: [
      { id: "s1", label: "Intro" },
      { id: "s2", label: "Deep dive" },
    ],
  },
];

const at = (iso: string) => new Date(iso);

describe("csvEscape", () => {
  it("leaves a plain value alone", () => {
    expect(csvEscape("Ada")).toBe("Ada");
  });

  it("quotes a value containing a comma", () => {
    expect(csvEscape("Lovelace, Ada")).toBe('"Lovelace, Ada"');
  });

  it("doubles embedded quotes", () => {
    expect(csvEscape('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("quotes a value containing a newline", () => {
    expect(csvEscape("one\ntwo")).toBe('"one\ntwo"');
  });
});

describe("buildCsv", () => {
  it("writes one column per question, in order", () => {
    const csv = buildCsv(fields, []);
    expect(csv.split("\r\n")[0]).toBe("Submitted at,Name,Sessions");
  });

  it("ends with a CRLF and separates rows with CRLF", () => {
    const csv = buildCsv(fields, [
      { submittedAt: at("2026-01-01T00:00:00Z"), answers: { q1: "Ada" } },
    ]);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("renders a row with resolved labels and an ISO timestamp", () => {
    const csv = buildCsv(fields, [
      {
        submittedAt: at("2026-03-04T09:30:00Z"),
        answers: { q1: "Ada", q2: ["s1", "s2"] },
      },
    ]);
    // A semicolon is not a delimiter, so the cell needs no quoting.
    expect(csv.split("\r\n")[1]).toBe(
      "2026-03-04T09:30:00.000Z,Ada,Intro; Deep dive",
    );
  });

  it("leaves an unanswered cell empty", () => {
    const csv = buildCsv(fields, [
      { submittedAt: at("2026-01-01T00:00:00Z"), answers: { q1: "Ada" } },
    ]);
    expect(csv.split("\r\n")[1]).toBe("2026-01-01T00:00:00.000Z,Ada,");
  });

  it("sorts rows oldest first regardless of input order", () => {
    const csv = buildCsv(fields, [
      { submittedAt: at("2026-05-01T00:00:00Z"), answers: { q1: "second" } },
      { submittedAt: at("2026-01-01T00:00:00Z"), answers: { q1: "first" } },
    ]);
    const rows = csv.split("\r\n");
    expect(rows[1]).toContain("first");
    expect(rows[2]).toContain("second");
  });

  it("adds a column for a deleted question, headed with its id", () => {
    // The response predates the field's deletion, so its answer is an orphan.
    const csv = buildCsv(fields, [
      {
        submittedAt: at("2026-01-01T00:00:00Z"),
        answers: { q1: "Ada", deleted_field: "kept" },
      },
    ]);
    const rows = csv.split("\r\n");
    expect(rows[0]).toBe("Submitted at,Name,Sessions,deleted_field");
    expect(rows[1]).toBe("2026-01-01T00:00:00.000Z,Ada,,kept");
  });

  it("quotes an answer that needs it", () => {
    const csv = buildCsv(fields, [
      {
        submittedAt: at("2026-01-01T00:00:00Z"),
        answers: { q1: "Lovelace, Ada" },
      },
    ]);
    expect(csv.split("\r\n")[1]).toContain('"Lovelace, Ada"');
  });

  it("quotes a question label that needs it", () => {
    const csv = buildCsv(
      [{ id: "q1", type: "short_text", label: "Where, exactly?", required: true }],
      [],
    );
    expect(csv.split("\r\n")[0]).toBe('Submitted at,"Where, exactly?"');
  });

  it("exports headers alone for a form with no responses", () => {
    expect(buildCsv(fields, [])).toBe("Submitted at,Name,Sessions\r\n");
  });
});

describe("csvFilename", () => {
  it("slugs the title", () => {
    expect(csvFilename("Team offsite")).toBe("team-offsite.csv");
  });

  it("collapses punctuation and never leaves a dangling dash", () => {
    expect(csvFilename("Q3 / Retro!")).toBe("q3-retro.csv");
  });

  it("falls back to 'form' for a title with nothing usable", () => {
    expect(csvFilename("   ")).toBe("form.csv");
    expect(csvFilename("***")).toBe("form.csv");
  });
});
