import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/fields";
import {
  answerToCell,
  displayAnswers,
  formatAnswerValues,
  orphanFieldIds,
} from "./answers";

const shortText: Field = {
  id: "q1",
  type: "short_text",
  label: "Name",
  required: true,
};

const number: Field = {
  id: "q2",
  type: "number",
  label: "Days",
  required: false,
};

const single: Field = {
  id: "q3",
  type: "single_choice",
  label: "Lunch",
  required: false,
  options: [
    { id: "o1", label: "Pizza" },
    { id: "o2", label: "Salad" },
  ],
};

const multi: Field = {
  id: "q4",
  type: "multi_choice",
  label: "Sessions",
  required: false,
  options: [
    { id: "s1", label: "Intro" },
    { id: "s2", label: "Deep dive" },
  ],
};

describe("formatAnswerValues", () => {
  it("leaves a text answer alone", () => {
    expect(formatAnswerValues(shortText, "Ada")).toEqual(["Ada"]);
  });

  it("renders a number as a string", () => {
    expect(formatAnswerValues(number, 3)).toEqual(["3"]);
  });

  it("resolves a choice answer to its option label", () => {
    expect(formatAnswerValues(single, "o2")).toEqual(["Salad"]);
  });

  it("renders a removed option id as the id, so the answer is not lost", () => {
    // The option is gone from the field, so no label survives anywhere.
    expect(formatAnswerValues(single, "o9")).toEqual(["o9"]);
  });

  it("falls back to the id when an option has no label", () => {
    const unlabelled: Field = {
      id: "q3",
      type: "single_choice",
      label: "Lunch",
      required: false,
      options: [{ id: "o1", label: "  " }],
    };
    expect(formatAnswerValues(unlabelled, "o1")).toEqual(["o1"]);
  });

  it("resolves every value of a multi-choice answer", () => {
    expect(formatAnswerValues(multi, ["s2", "s1"])).toEqual([
      "Deep dive",
      "Intro",
    ]);
  });

  it("shows an orphan answer as stored", () => {
    // The question is gone, so an option id has no label to resolve against.
    expect(formatAnswerValues(null, "s1")).toEqual(["s1"]);
    expect(formatAnswerValues(null, ["s1", "s2"])).toEqual(["s1", "s2"]);
  });

  it("is empty for a missing answer", () => {
    expect(formatAnswerValues(shortText, undefined)).toEqual([]);
    expect(formatAnswerValues(shortText, null)).toEqual([]);
  });
});

describe("answerToCell", () => {
  it("joins a multi-choice answer for one cell", () => {
    expect(answerToCell(["Deep dive", "Intro"])).toBe("Deep dive; Intro");
  });

  it("is empty for no values", () => {
    expect(answerToCell([])).toBe("");
  });
});

describe("displayAnswers", () => {
  it("keeps question order and labels", () => {
    expect(
      displayAnswers([shortText, number], { q2: 3, q1: "Ada" }),
    ).toEqual([
      { fieldId: "q1", label: "Name", values: ["Ada"], orphan: false },
      { fieldId: "q2", label: "Days", values: ["3"], orphan: false },
    ]);
  });

  it("omits a question with no answer", () => {
    const result = displayAnswers([shortText, number], { q1: "Ada" });
    expect(result.map((answer) => answer.fieldId)).toEqual(["q1"]);
  });

  it("puts orphan answers last and labels them by id", () => {
    const result = displayAnswers([shortText], {
      q1: "Ada",
      deleted: "something",
    });

    expect(result[1]).toEqual({
      fieldId: "deleted",
      label: "deleted",
      values: ["something"],
      orphan: true,
    });
  });

  it("falls back to the placeholder for a blank question label", () => {
    const blank: Field = {
      id: "q9",
      type: "short_text",
      label: "   ",
      required: false,
    };
    expect(displayAnswers([blank], { q9: "x" })[0].label).toBe(
      "Untitled question",
    );
  });
});

describe("orphanFieldIds", () => {
  it("finds answers with no matching question", () => {
    expect(
      orphanFieldIds([shortText], [
        { answers: { q1: "Ada", deleted: "x" } },
        { answers: { other: "y" } },
      ]),
    ).toEqual(["deleted", "other"]);
  });

  it("returns each id once, in first-seen order", () => {
    expect(
      orphanFieldIds([], [
        { answers: { b: "1" } },
        { answers: { a: "2", b: "3" } },
      ]),
    ).toEqual(["b", "a"]);
  });

  it("is empty when every answer has a question", () => {
    expect(orphanFieldIds([shortText], [{ answers: { q1: "Ada" } }])).toEqual(
      [],
    );
  });
});
