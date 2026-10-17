import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/fields";
import {
  canAcceptResponses,
  hashIp,
  readAnswersFromFormData,
} from "./submit";

const fields: Field[] = [
  { id: "t1", type: "short_text", label: "Name", required: false },
  {
    id: "m1",
    type: "multi_choice",
    label: "Pick many",
    required: false,
    options: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
  },
];

function formData(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}

describe("canAcceptResponses", () => {
  it("takes responses only when published and open", () => {
    expect(canAcceptResponses({ status: "published", acceptResponses: true })).toBe(true);
  });

  it("refuses a published form that was closed", () => {
    expect(canAcceptResponses({ status: "published", acceptResponses: false })).toBe(false);
  });

  it("refuses a draft", () => {
    expect(canAcceptResponses({ status: "draft", acceptResponses: true })).toBe(false);
  });
});

describe("readAnswersFromFormData", () => {
  it("reads a scalar answer", () => {
    expect(readAnswersFromFormData(fields, formData({ t1: "Ada" }))).toEqual({
      t1: "Ada",
    });
  });

  it("collects a multi-choice answer into an array", () => {
    expect(readAnswersFromFormData(fields, formData({ m1: ["a", "b"] }))).toEqual({
      m1: ["a", "b"],
    });
  });

  it("normalises a lone multi-choice value into an array", () => {
    expect(readAnswersFromFormData(fields, formData({ m1: "a" }))).toEqual({
      m1: ["a"],
    });
  });

  it("omits a field the respondent left empty", () => {
    expect(readAnswersFromFormData(fields, formData({ t1: "", m1: "" }))).toEqual(
      {},
    );
  });

  it("preserves typed whitespace for the echo", () => {
    expect(readAnswersFromFormData(fields, formData({ t1: "  Ada  " }))).toEqual({
      t1: "  Ada  ",
    });
  });

  it("ignores a value for a field that is not on the form", () => {
    // A respondent can add inputs to the DOM. The schema is what decides.
    expect(readAnswersFromFormData(fields, formData({ ghost: "x" }))).toEqual({});
  });

  it("keeps real answers while ignoring injected ones", () => {
    expect(
      readAnswersFromFormData(fields, formData({ t1: "Ada", ghost: "x" })),
    ).toEqual({ t1: "Ada" });
  });
});

describe("hashIp", () => {
  it("is a sha256 hex digest", () => {
    expect(hashIp("203.0.113.7", "salt")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for one salt", () => {
    expect(hashIp("203.0.113.7", "salt")).toBe(hashIp("203.0.113.7", "salt"));
  });

  it("changes with the salt, so rotating it unlinks past values", () => {
    expect(hashIp("203.0.113.7", "one")).not.toBe(hashIp("203.0.113.7", "two"));
  });

  it("does not leak the address", () => {
    expect(hashIp("203.0.113.7", "salt")).not.toContain("203.0.113.7");
  });
});
