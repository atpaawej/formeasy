import { describe, expect, it } from "vitest";

import { newFieldId, newFormId, newOptionId } from "./ids";

const URL_SAFE = /^[0-9A-Za-z]+$/;
// Characters that get misread when a link is read aloud, retyped, or copied
// out of a screenshot.
const AMBIGUOUS = ["l", "I", "O"];

describe("ids", () => {
  it("sizes a form id at 10 characters and a field or option id at 8", () => {
    expect(newFormId()).toHaveLength(10);
    expect(newFieldId()).toHaveLength(8);
    expect(newOptionId()).toHaveLength(8);
  });

  it("only emits URL-safe characters", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(newFormId()).toMatch(URL_SAFE);
    }
  });

  it("never emits a character that is easy to misread", () => {
    const sample = Array.from({ length: 500 }, () => newFormId()).join("");
    for (const character of AMBIGUOUS) {
      expect(sample).not.toContain(character);
    }
  });

  it("does not repeat an id across a large batch", () => {
    const batch = new Set(Array.from({ length: 2000 }, () => newFieldId()));
    expect(batch.size).toBe(2000);
  });

  it("does not repeat across the three id spaces", () => {
    // They share an alphabet, so the guarantee has to come from length+randomness.
    expect(newFieldId()).not.toBe(newOptionId());
  });
});
