import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/fields";

import { formPayload, formSummaryPayload, responsePayload } from "./payload";

/*
 * The JSON an agent sees. These tests pin the two promises the human-facing side
 * makes and the API must not break: option ids resolve to today's labels, and an
 * answer whose question was deleted is surfaced under its raw field id rather
 * than dropped.
 */

const CHOICE: Field = {
  id: "c1",
  type: "single_choice",
  label: "Pick",
  required: true,
  options: [
    { id: "o1", label: "Yes" },
    { id: "o2", label: "No" },
  ],
};

const form = {
  id: "form1",
  ownerId: "user_1",
  title: "Team offsite",
  description: null,
  status: "published",
  acceptResponses: true,
  fields: [CHOICE],
  settings: {},
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T03:04:05Z"),
};

describe("formPayload", () => {
  it("serializes the form with ISO timestamps and a public path", () => {
    const payload = formPayload(form);

    expect(payload).toMatchObject({
      id: "form1",
      title: "Team offsite",
      status: "published",
      acceptResponses: true,
      publicPath: "/f/form1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T03:04:05.000Z",
    });
    expect(payload.fields).toEqual([CHOICE]);
  });
});

describe("formSummaryPayload", () => {
  it("carries the count and the timestamp", () => {
    expect(
      formSummaryPayload({
        id: "form1",
        title: "Team offsite",
        status: "draft",
        acceptResponses: true,
        updatedAt: new Date("2026-01-02T03:04:05Z"),
        responseCount: 4,
      }),
    ).toMatchObject({
      status: "draft",
      responseCount: 4,
      updatedAt: "2026-01-02T03:04:05.000Z",
    });
  });
});

describe("responsePayload", () => {
  it("resolves an option id to its label, and keeps the raw value too", () => {
    const payload = responsePayload([CHOICE], {
      id: "resp1",
      answers: { c1: "o2" },
      submittedAt: new Date("2026-01-03T00:00:00Z"),
    });

    expect(payload.submittedAt).toBe("2026-01-03T00:00:00.000Z");
    expect(payload.answers).toEqual({ c1: "o2" });
    expect(payload.display).toEqual([
      { fieldId: "c1", label: "Pick", values: ["No"], orphan: false },
    ]);
  });

  it("shows an answer whose question was deleted under its raw field id", () => {
    const payload = responsePayload([], {
      id: "resp2",
      answers: { gone: "kept" },
      submittedAt: new Date("2026-01-03T00:00:00Z"),
    });

    expect(payload.display).toEqual([
      { fieldId: "gone", label: "gone", values: ["kept"], orphan: true },
    ]);
  });
});
