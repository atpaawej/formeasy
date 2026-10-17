import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD, honeypotTripped } from "./honeypot";

/* The honeypot's whole job is telling a bot apart from a person. */

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

describe("honeypotTripped", () => {
  it("passes a submission that never touched the honeypot", () => {
    expect(honeypotTripped(formData({ t1: "Ada" }))).toBe(false);
  });

  it("trips when a bot fills the field it can see in the HTML", () => {
    expect(
      honeypotTripped(
        formData({ t1: "Ada", [HONEYPOT_FIELD]: "https://spam.example" }),
      ),
    ).toBe(true);
  });

  it("tolerates the whitespace an autofiller may leave behind", () => {
    expect(honeypotTripped(formData({ [HONEYPOT_FIELD]: "   " }))).toBe(false);
  });

  it("trips on a value that is only whitespace and content", () => {
    expect(honeypotTripped(formData({ [HONEYPOT_FIELD]: " spambot " }))).toBe(
      true,
    );
  });
});
