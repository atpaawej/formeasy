import { describe, expect, it } from "vitest";

import { FORM_STATUS_LABEL, formStatus } from "./status";

describe("formStatus", () => {
  it("treats anything that is not published as a draft", () => {
    expect(formStatus("draft", true)).toBe("draft");
    expect(formStatus("draft", false)).toBe("draft");
    expect(formStatus("garbage", true)).toBe("draft");
  });

  it("is published while it accepts responses", () => {
    expect(formStatus("published", true)).toBe("published");
  });

  it("is closed, not draft, once a published form stops accepting", () => {
    // Closing must leave the form viewable. Collapsing this to 'draft' would
    // 404 the public link. See docs/design.md.
    expect(formStatus("published", false)).toBe("closed");
  });

  it("has a label for every state", () => {
    expect(Object.keys(FORM_STATUS_LABEL).sort()).toEqual([
      "closed",
      "draft",
      "published",
    ]);
  });
});
