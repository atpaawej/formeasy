import { beforeEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD } from "./honeypot";
import { MAX_ANSWER_BYTES, RATE_LIMIT_MAX, hashIp } from "./submit";

/*
 * The submit path, exercised without a request or a database. The point of these
 * tests is the gate: who is allowed to write a row, and what happens to a
 * respondent's answers when validation says no.
 */

const mocks = vi.hoisted(() => ({
  getFormById: vi.fn(),
  countRecentResponses: vi.fn(),
  insertValues: vi.fn(),
  reportError: vi.fn(),
  /** Mutable so a test can present a request with no forwarding headers. */
  forwardedFor: "203.0.113.7, 10.0.0.1" as string,
}));

vi.mock("@/lib/forms/queries", () => ({
  getFormById: mocks.getFormById,
  countRecentResponses: mocks.countRecentResponses,
}));
vi.mock("@/lib/db", () => ({
  db: { insert: () => ({ values: mocks.insertValues }) },
}));
vi.mock("@/lib/observability", () => ({ reportError: mocks.reportError }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => {
    const headerList = new Headers({
      "user-agent": "vitest-agent",
      referer: "https://example.test/f/form1",
    });
    if (mocks.forwardedFor) {
      headerList.set("x-forwarded-for", mocks.forwardedFor);
    }
    return headerList;
  },
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
  mocks.countRecentResponses.mockReset();
  mocks.insertValues.mockReset();
  mocks.reportError.mockReset();
  mocks.forwardedFor = "203.0.113.7, 10.0.0.1";
  mocks.countRecentResponses.mockResolvedValue(0);
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

  it("refuses an over-long answer with the field's own message, not the size cap", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ t1: "x".repeat(6000) }),
    );

    expect(result.errors.t1).toContain("5000");
    expect(result.formError).toBeUndefined();
  });
});

describe("submitResponse — the honeypot", () => {
  it("answers a filled honeypot with the thank-you page and writes nothing", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    await expect(
      submitResponse(
        "form1",
        { errors: {} },
        formData({ t1: "Ada", [HONEYPOT_FIELD]: "cheap pills, click here" }),
      ),
    ).rejects.toThrow("REDIRECT:/f/form1/submitted");

    expect(mocks.insertValues).not.toHaveBeenCalled();
    // Turned away before the counter is even consulted.
    expect(mocks.countRecentResponses).not.toHaveBeenCalled();
  });

  it("passes a submission that left the honeypot alone", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    await expect(
      submitResponse("form1", { errors: {} }, formData({ t1: "Ada" })),
    ).rejects.toThrow("REDIRECT:/f/form1/submitted");
  });
});

describe("submitResponse — the rate limit", () => {
  it("refuses once this IP has spent the form's allowance", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);
    mocks.countRecentResponses.mockResolvedValue(RATE_LIMIT_MAX);

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ t1: "Ada" }),
    );

    expect(result.formError).toContain("Try again later");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("counts by form and by hashed IP, within a window that ends now", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    await expect(
      submitResponse("form1", { errors: {} }, formData({ t1: "Ada" })),
    ).rejects.toThrow("REDIRECT:");

    const [formId, ipHash, since] = mocks.countRecentResponses.mock.calls[0];
    expect(formId).toBe("form1");
    expect(ipHash).toBe(hashIp("203.0.113.7", SALT));
    expect(since.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("skips the count when there is no address to attribute it to", async () => {
    mocks.forwardedFor = "";
    mocks.getFormById.mockResolvedValue(publishedForm);

    await expect(
      submitResponse("form1", { errors: {} }, formData({ t1: "Ada" })),
    ).rejects.toThrow("REDIRECT:");

    expect(mocks.countRecentResponses).not.toHaveBeenCalled();
  });
});

describe("submitResponse — oversized payloads", () => {
  it("refuses a single answer past the cap, without echoing it back", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ t1: "x".repeat(MAX_ANSWER_BYTES + 1) }),
    );

    expect(result.formError).toContain("too large");
    expect(result.values).toBeUndefined();
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });
});

describe("submitResponse — the database is down", () => {
  it("returns a friendly sentence and the answers, and reports the failure", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);
    const failure = new Error("connection terminated unexpectedly");
    mocks.insertValues.mockRejectedValue(failure);

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ t1: "Ada" }),
    );

    expect(result.formError).toBe(
      "Something went wrong saving your response. Please try again.",
    );
    expect(result.errors).toEqual({});
    // Their form comes back filled, even when the write did not happen.
    expect(result.values).toEqual({ t1: "Ada" });
    expect(mocks.reportError).toHaveBeenCalledWith(failure, {
      where: "submitResponse",
      formId: "form1",
    });
  });

  it("never leaks the driver's message to the respondent", async () => {
    mocks.getFormById.mockResolvedValue(publishedForm);
    mocks.insertValues.mockRejectedValue(
      new Error('relation "responses" does not exist'),
    );

    const result = await submitResponse(
      "form1",
      { errors: {} },
      formData({ t1: "Ada" }),
    );

    expect(result.formError).not.toContain("relation");
  });
});
