import { describe, expect, it } from "vitest";

import { clampText } from "@/lib/og/text";

describe("clampText", () => {
  it("leaves text that already fits alone", () => {
    expect(clampText("Make a form.", 88)).toBe("Make a form.");
  });

  it("trims and collapses whitespace, so a form description cannot break the line", () => {
    expect(clampText("  First line\n\n second\tline  ", 88)).toBe(
      "First line second line",
    );
  });

  it("does not add an ellipsis at exactly the limit", () => {
    const exact = "x".repeat(20);
    expect(clampText(exact, 20)).toBe(exact);
  });

  it("cuts on a word boundary and marks the cut", () => {
    expect(clampText("the quick brown fox jumps", 20)).toBe("the quick brown fox…");
  });

  it("cuts mid-word rather than keeping a sliver of the line", () => {
    // The last space is past the halfway mark of the budget, but past it the
    // remaining text is one long token, so the hard cut is the honest one.
    expect(clampText(`${"a".repeat(30)} tail`, 10)).toBe(`${"a".repeat(10)}…`);
  });

  it("returns an empty string for empty input", () => {
    expect(clampText("", 10)).toBe("");
  });
});
