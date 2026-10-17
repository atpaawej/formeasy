import { describe, expect, it } from "vitest";

import {
  cloneField,
  emptyAnswers,
  fieldLabel,
  FIELD_TYPE_ORDER,
  isChoiceField,
  newField,
  newOption,
  parseFields,
  parseFormSettings,
  UNTITLED_QUESTION,
  validateAnswers,
  validateFormForPublish,
  type Field,
} from "./fields";

const text: Field = {
  id: "t1",
  type: "short_text",
  label: "Name",
  required: true,
};

const optionalText: Field = {
  id: "t2",
  type: "long_text",
  label: "Notes",
  required: false,
};

const number: Field = {
  id: "n1",
  type: "number",
  label: "Age",
  required: false,
  min: 0,
  max: 120,
};

const date: Field = {
  id: "d1",
  type: "date",
  label: "When",
  required: true,
};

const single: Field = {
  id: "s1",
  type: "single_choice",
  label: "Pick one",
  required: true,
  options: [
    { id: "o1", label: "A" },
    { id: "o2", label: "B" },
  ],
};

const multi: Field = {
  id: "m1",
  type: "multi_choice",
  label: "Pick many",
  required: false,
  options: [
    { id: "p1", label: "X" },
    { id: "p2", label: "Y" },
  ],
};

describe("validateAnswers", () => {
  it("reports a missing required answer", () => {
    const { answers, errors } = validateAnswers([text], {});
    expect(errors.t1).toBe("This question needs an answer");
    expect(answers).toEqual({});
  });

  it("accepts a present required answer and trims it", () => {
    const { answers, errors } = validateAnswers([text], { t1: "  Ada  " });
    expect(errors).toEqual({});
    expect(answers.t1).toBe("Ada");
  });

  it("treats whitespace-only input as missing", () => {
    const { errors } = validateAnswers([text], { t1: "   " });
    expect(errors.t1).toBeDefined();
  });

  it("omits an empty optional answer without erroring", () => {
    const { answers, errors } = validateAnswers([optionalText], { t2: "" });
    expect(errors).toEqual({});
    expect(answers).toEqual({});
  });

  it("coerces a number and accepts it in range", () => {
    const { answers, errors } = validateAnswers([number], { n1: "42" });
    expect(errors).toEqual({});
    expect(answers.n1).toBe(42);
  });

  it("rejects a number out of range", () => {
    const { errors } = validateAnswers([number], { n1: "9000" });
    expect(errors.n1).toContain("120");
  });

  it("rejects a non-numeric number", () => {
    const { errors } = validateAnswers([number], { n1: "abc" });
    expect(errors.n1).toBe("Enter a number");
  });

  it("accepts a valid option id and rejects an unknown one", () => {
    expect(validateAnswers([single], { s1: "o2" }).errors).toEqual({});
    expect(validateAnswers([single], { s1: "nope" }).errors.s1).toBeDefined();
  });

  it("keeps valid multi-choice ids and rejects unknown ones", () => {
    const ok = validateAnswers([multi], { m1: ["p1", "p2"] });
    expect(ok.errors).toEqual({});
    expect(ok.answers.m1).toEqual(["p1", "p2"]);

    const bad = validateAnswers([multi], { m1: ["p1", "ghost"] });
    expect(bad.errors.m1).toBeDefined();
  });

  it("collapses a single multi-choice value into an array", () => {
    const { answers } = validateAnswers([multi], { m1: "p1" });
    expect(answers.m1).toEqual(["p1"]);
  });

  it("requires a date and rejects a malformed one", () => {
    expect(validateAnswers([date], { d1: "2026-10-17" }).errors).toEqual({});
    expect(validateAnswers([date], { d1: "17/10/2026" }).errors.d1).toBeDefined();
    expect(validateAnswers([date], {}).errors.d1).toBeDefined();
  });
});

describe("validateFormForPublish", () => {
  it("flags an empty form", () => {
    expect(validateFormForPublish([])).toHaveLength(1);
  });

  it("flags an unlabelled question", () => {
    const blank = newField("short_text");
    expect(validateFormForPublish([blank]).join(" ")).toContain("needs a label");
  });

  it("flags a choice question with fewer than two options", () => {
    const field: Field = {
      id: "c1",
      type: "single_choice",
      label: "Pick",
      required: false,
      options: [newOption("Only one")],
    };
    expect(validateFormForPublish([field]).join(" ")).toContain("two options");
  });

  it("accepts a well-formed form", () => {
    expect(validateFormForPublish([text, single])).toEqual([]);
  });
});

describe("newField", () => {
  it("mints a fresh id each time", () => {
    expect(newField("short_text").id).not.toBe(newField("short_text").id);
  });

  it("gives choice fields two options", () => {
    const field = newField("single_choice");
    expect(field.type).toBe("single_choice");
    if (field.type === "single_choice") {
      expect(field.options).toHaveLength(2);
    }
  });

  it("round-trips every field type through the server-side parser", () => {
    // newField is what the builder calls; parseFields is what the server trusts.
    // If they disagree, a saved field is silently dropped on the way to the DB.
    for (const type of FIELD_TYPE_ORDER) {
      const field = newField(type);
      const parsed = parseFields([field]);
      expect(parsed, `parseFields should accept newField(${type})`).not.toBeNull();
      expect(parsed?.[0].id).toBe(field.id);
      expect(parsed?.[0].type).toBe(type);
    }
  });

  it("starts a new field unnamed and optional", () => {
    const field = newField("short_text");
    expect(field.label).toBe("");
    expect(field.required).toBe(false);
  });
});

describe("cloneField", () => {
  it("mints a new field id and keeps the content", () => {
    const copy = cloneField(text);
    expect(copy.id).not.toBe(text.id);
    expect(copy.label).toBe(text.label);
    expect(copy.type).toBe(text.type);
  });

  it("mints new option ids so no two questions share answer keys", () => {
    const copy = cloneField(single);
    if (copy.type !== "single_choice") throw new Error("expected a choice field");

    expect(copy.options.map((option) => option.id)).not.toContain("o1");
    expect(copy.options.map((option) => option.label)).toEqual(["A", "B"]);
  });

  it("does not mutate the original", () => {
    cloneField(single);
    if (single.type !== "single_choice") throw new Error("expected a choice field");
    expect(single.options.map((option) => option.id)).toEqual(["o1", "o2"]);
  });
});

describe("emptyAnswers", () => {
  it("starts a multi-choice at an empty array and everything else at an empty string", () => {
    expect(emptyAnswers([text, multi])).toEqual({ t1: "", m1: [] });
  });

  it("returns an empty object for a form with no questions", () => {
    expect(emptyAnswers([])).toEqual({});
  });
});

describe("fieldLabel", () => {
  it("falls back for a question that was never named", () => {
    expect(fieldLabel({ ...text, label: "   " })).toBe(UNTITLED_QUESTION);
  });

  it("uses the label when there is one", () => {
    expect(fieldLabel(text)).toBe("Name");
  });
});

describe("isChoiceField", () => {
  it("is true for the three option-bearing types", () => {
    for (const type of ["single_choice", "multi_choice", "dropdown"] as const) {
      expect(isChoiceField(newField(type))).toBe(true);
    }
  });

  it("is false for the scalar types", () => {
    for (const type of ["short_text", "long_text", "number", "date"] as const) {
      expect(isChoiceField(newField(type))).toBe(false);
    }
  });
});

describe("parseFields", () => {
  it("accepts a well-formed list", () => {
    expect(parseFields([text, single])).not.toBeNull();
  });

  it("preserves values it accepts", () => {
    const parsed = parseFields([{ id: "n1", type: "number", label: "Age", required: true, min: 0, max: 120 }]);
    expect(parsed).toEqual([
      { id: "n1", type: "number", label: "Age", required: true, min: 0, max: 120 },
    ]);
  });

  it("rejects an unknown field type", () => {
    expect(
      parseFields([{ id: "x", type: "signature", label: "Sign", required: false }]),
    ).toBeNull();
  });

  it("rejects a choice field with no options array", () => {
    expect(
      parseFields([{ id: "x", type: "single_choice", label: "Pick", required: false }]),
    ).toBeNull();
  });

  it("rejects a field with no id", () => {
    expect(parseFields([{ id: " ", type: "short_text", label: "Hi", required: false }])).toBeNull();
  });

  it("rejects a field missing the required flag", () => {
    expect(parseFields([{ id: "x", type: "short_text", label: "Hi" }])).toBeNull();
  });

  it("rejects anything that is not an array", () => {
    expect(parseFields({ fields: [] })).toBeNull();
    expect(parseFields(null)).toBeNull();
    expect(parseFields(undefined)).toBeNull();
  });
});

describe("parseFormSettings", () => {
  it("keeps the keys it knows", () => {
    expect(parseFormSettings({ submitLabel: "Send it" })).toEqual({
      submitLabel: "Send it",
    });
  });

  it("drops unknown keys", () => {
    expect(parseFormSettings({ submitLabel: "Send", theme: "dark" })).toEqual({
      submitLabel: "Send",
    });
  });

  it("falls back to empty rather than throwing on junk", () => {
    expect(parseFormSettings(null)).toEqual({});
    expect(parseFormSettings({ submitLabel: 5 })).toEqual({});
  });
});
