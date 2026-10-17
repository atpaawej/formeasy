import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashIp } from "./submit";

/*
 * The submit path, exercised without a request or a database. The point of these
 * tests is the gate: who is allowed to write a row, and what happens to a
 * respondent's answers when validation says no.
 */

const mocks = vi.hoisted(() => ({
  getFormById: vi.fn(),
  insertValues: vi.fn(),
}));

vi.mock("@/lib/forms/queries", () => ({ getFormById: mocks.getFormById }));
vi.mock("@/lib/db", () => ({
  db: { insert: () => ({ values: mocks.insertValues }) },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "user-agent": "vitest-agent",
      referer: "https://example.test/f/form1",
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    }),
}));

const { submitResponse } = await import("./public-actions");

const SALT = "test-salt";
process.env.RESPONSE_HASH_SALT = SALT;

const IDENTITY_FIELDS = [
  { id: "t1", type: "short_text" as const, label: "Name", required: true },
  {
    id: "n1",
    type: "number" as const,
    label: "Days",
    required: false,
    min: 1,
    max: 10,
  },
];

const publishedForm = {
  id: "form1",
  ownerId: "user_1",
  title: "Team offsite",
  description: null,
  status: "published",
  acceptResponses: true,
  fields: IDENTITY_FIELDS,
  settings: {},
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function formData(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}

beforeEach(() => {
  mocks.getFormById.mockReset();
  mocks.insertValues.mockReset();
  mocks.insertValues.mockResolvedValue(undefined);
});

describe("submitResponse — the gate", () => {
  it("refuses an unknown form", async () => {
    mocks.getFormById.mockResolvedValue(null);

    const result = await submitResponse("missing", { errors: {} }, formData({}));

    expect(result.formError).toBe("This form is not accepting responses.");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("refuses a draft form", async () => {
    mocks.getFormById.mockResolvedValue({ ...publishedForm, status: "draft" });

    const result = await submitResponse("form1", { errors: {} }, formData({ t1: "Ada" }));

    expect(result.formError).toBe("This form is not accepting responses.");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("refuses a published form that was closed, with its own message", async () => {
    mocks.getFormById.mockResolvedValue({
      ...publishedForm,
      acceptResponses: false,
    });

    const result = await submitResponse("form1", { errors: {} }, formData({ t1: "Ada" }));

    expect(result.formError).toBe(
      "This form is no longer accepting responses.",
    );
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });
});

describe("submitResponse — storing", () => {
  it("stores the validated answers with response metadata and redirects", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    await expect(
      submitResponse("form1", { errors: {} }, formData({ t1: "Ada", n1: "3" })),
    ).rejects.toThrow("REDIRECT:/f/form1/submitted");

    expect(mocks.insertValues).toHaveBeenCalledTimes(1);
    const inserted = mocks.insertValues.mock.calls[0][0];

    expect(inserted.formId).toBe("form1");
    // Numbers arrive as strings from FormData and are stored as numbers.
    expect(inserted.answers).toEqual({ t1: "Ada", n1: 3 });
    expect(inserted.meta.userAgent).toBe("vitest-agent");
    expect(inserted.meta.referrer).toBe("https://example.test/f/form1");
    // Only the first hop of x-forwarded-for, and only as a salted hash.
    expect(inserted.meta.ipHash).toBe(hashIp("203.0.113.7", SALT));
  });

  it("ignores an answer injected for a field the form does not have", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    await expect(
      submitResponse(
        "form1",
        { errors: {} },
        formData({ t1: "Ada", ghost: "injected" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(mocks.insertValues.mock.calls[0][0].answers).toEqual({ t1: "Ada" });
  });

  it("stores an empty object when every question is optional and unanswered", async () => {
    mocks.getFormById.mockResolvedValue({
      ...publishedForm,
      fields: [
        { id: "t1", type: "short_text", label: "Notes", required: false },
      ],
    });

    await expect(
      submitResponse("form1", { errors: {} }, formData({ t1: "" })),
    ).rejects.toThrow("REDIRECT:");

    expect(mocks.insertValues.mock.calls[0][0].answers).toEqual({});
  });
});

describe("submitResponse — rejection", () => {
  it("returns errors and the submitted values, and writes nothing", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ t1: "", n1: "9000" }),
    );

    expect(result.errors.t1).toBe("This question needs an answer");
    expect(result.errors.n1).toContain("10");
    // Echoed back so the re-render does not wipe the form.
    expect(result.values).toEqual({ n1: "9000" });
    expect(result.formError).toBeUndefined();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects a choice answer naming an option that does not exist", async () => {
    mocks.getFormById.mockResolvedValue({
      ...publishedForm,
      fields: [
        {
          id: "c1",
          type: "single_choice",
          label: "Pick",
          required: true,
          options: [
            { id: "o1", label: "A" },
            { id: "o2", label: "B" },
          ],
        },
      ],
    });

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ c1: "forged" }),
    );

    expect(result.errors.c1).toBe("Pick one of the options");
    expect(result.values).toEqual({ c1: "forged" });
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("does not redirect on a rejected submission", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    // A redirect throws; a rejection must resolve normally instead.
    await expect(
      submitResponse("form1", { errors: {} }, formData({ t1: "" })),
    ).resolves.toMatchObject({ errors: expect.any(Object) });
  });
});
