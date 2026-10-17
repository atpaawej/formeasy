import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/fields";

import {
  cleanDraft,
  cleanDescription,
  cleanTitle,
  MAX_TITLE,
  parseDraftInput,
  parseDraftPatch,
} from "./draft";

/*
 * The draft rules shared by the builder's autosave and the agent API. The point
 * of these tests is that an untrusted JSON body can never smuggle a shape the
 * builder would not be able to open.
 */

const SHORT_TEXT: Field = {
  id: "f1",
  type: "short_text",
  label: "Name",
  required: true,
};

describe("cleanTitle / cleanDescription", () => {
  it("trims and defaults a blank title rather than rejecting it", () => {
    expect(cleanTitle("  Team offsite  ")).toBe("Team offsite");
    expect(cleanTitle("")).toBe("Untitled form");
    expect(cleanTitle("   ")).toBe("Untitled form");
  });

  it("clamps a title to the column's length", () => {
    expect(cleanTitle("x".repeat(500))).toHaveLength(MAX_TITLE);
  });

  it("keeps an empty description empty", () => {
    expect(cleanDescription("  ")).toBe("");
  });
});

describe("cleanDraft", () => {
  it("normalizes a draft", () => {
    expect(
      cleanDraft({ title: "  Hi ", description: " hi ", fields: [SHORT_TEXT] }),
    ).toEqual({ title: "Hi", description: "hi", fields: [SHORT_TEXT] });
  });

  it("throws when the field list is malformed", () => {
    expect(() =>
      cleanDraft({ title: "", description: "", fields: [{ nope: true }] as never }),
    ).toThrow();
  });
});

describe("parseDraftInput", () => {
  it("treats a missing body or missing keys as the empty draft", () => {
    expect(parseDraftInput({})).toEqual({ title: "", description: "", fields: [] });
    expect(parseDraftInput({ title: "Only a title" })).toMatchObject({
      title: "Only a title",
      fields: [],
    });
  });

  it("rejects anything that is not an object", () => {
    for (const value of [undefined, null, "x", 7, [], true]) {
      expect(parseDraftInput(value)).toBeNull();
    }
  });

  it("rejects a fields key that is not a well-formed field list", () => {
    expect(parseDraftInput({ fields: "nope" })).toBeNull();
    expect(parseDraftInput({ fields: [{ ...SHORT_TEXT, id: "" }] })).toBeNull();
    expect(parseDraftInput({ fields: [{ ...SHORT_TEXT, type: "wat" }] })).toBeNull();
  });

  it("rejects a key of the wrong type rather than coercing it", () => {
    expect(parseDraftInput({ title: 5 })).toBeNull();
    expect(parseDraftInput({ description: [] })).toBeNull();
  });
});

describe("parseDraftPatch", () => {
  it("returns only the keys that were sent", () => {
    expect(parseDraftPatch({ title: "New" })).toEqual({ title: "New" });
    expect(parseDraftPatch({ acceptResponses: false })).toEqual({
      acceptResponses: false,
    });
    expect(parseDraftPatch({})).toEqual({});
  });

  it("ignores status, which has its own validating endpoints", () => {
    expect(parseDraftPatch({ status: "published" })).toEqual({});
  });

  it("rejects a key of the wrong type", () => {
    expect(parseDraftPatch({ title: 5 })).toBeNull();
    expect(parseDraftPatch({ acceptResponses: "yes" })).toBeNull();
    expect(parseDraftPatch({ fields: [SHORT_TEXT, { nope: 1 }] })).toBeNull();
  });

  it("accepts a full replacement field list", () => {
    expect(parseDraftPatch({ fields: [SHORT_TEXT] })).toEqual({
      fields: [SHORT_TEXT],
    });
  });
});
