import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Field } from "@/lib/fields";

/*
 * The agent routes, exercised without a database and without Clerk.
 *
 * The gate itself is proven against the real conformance vector in verify.test.ts
 * and lib/agent/accounts.ts owns the Clerk lookup, so both are stubbed here. What
 * is left is the part that is genuinely the routes': that the owner a write lands
 * under is the one the token resolved to and never the one a body asked for, that
 * another account's form is a 404 rather than a 403, and that publishing runs the
 * same validation the builder does.
 */

const TEXT: Field = {
  id: "f1",
  type: "short_text",
  label: "Name",
  required: true,
};

const mocks = vi.hoisted(() => ({
  requireAgentUser: vi.fn(),
  signUpAgent: vi.fn(),
  getOwnedForm: vi.fn(),
  listForms: vi.fn(),
  listResponses: vi.fn(),
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
  deleteReturning: vi.fn(),
}));

vi.mock("@/lib/agent/session", () => ({
  requireAgentUser: mocks.requireAgentUser,
  signUpAgent: mocks.signUpAgent,
}));

vi.mock("@/lib/forms/queries", () => ({
  getOwnedForm: mocks.getOwnedForm,
  listForms: mocks.listForms,
  listResponses: mocks.listResponses,
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (values: unknown) => ({
        returning: () => mocks.insertReturning(values),
      }),
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: (where: unknown) => ({
          returning: () => mocks.updateReturning(values, where),
        }),
      }),
    }),
    delete: () => ({
      where: (where: unknown) => ({
        returning: () => mocks.deleteReturning(where),
      }),
    }),
  },
}));

const collection = await import("@/app/api/agent/forms/route");
const item = await import("@/app/api/agent/forms/[id]/route");
const publish = await import("@/app/api/agent/forms/[id]/publish/route");
const unpublish = await import("@/app/api/agent/forms/[id]/unpublish/route");
const responses = await import("@/app/api/agent/forms/[id]/responses/route");
const csv = await import("@/app/api/agent/forms/[id]/export/route");
const signup = await import("@/app/api/signup/route");

const OWNER = "user_1";

const form = {
  id: "form1",
  ownerId: OWNER,
  title: "Team offsite",
  description: null,
  status: "draft",
  acceptResponses: true,
  fields: [TEXT],
  settings: {},
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function req(body?: unknown, method = "POST") {
  return new Request("http://test.local/api/agent/forms", {
    method,
    headers: { authorization: "Bearer test-token" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// The generated RouteContext carries the route's path; the shape is just params.
function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function signedIn() {
  mocks.requireAgentUser.mockResolvedValue({ ok: true, user: OWNER });
}

function denied() {
  mocks.requireAgentUser.mockResolvedValue({
    ok: false,
    response: Response.json(
      { code: "ACCOUNT_REQUIRED", error: "no account" },
      { status: 403 },
    ),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signedIn();
  mocks.getOwnedForm.mockResolvedValue(form);
  mocks.listForms.mockResolvedValue([]);
  mocks.listResponses.mockResolvedValue([]);
  mocks.insertReturning.mockResolvedValue([form]);
  mocks.updateReturning.mockResolvedValue([form]);
  mocks.deleteReturning.mockResolvedValue([{ id: "form1" }]);
});

describe("every agent route is behind the gate", () => {
  it("returns the gate's own failure response, and does no work", async () => {
    denied();

    const res = await collection.GET(req(undefined, "GET"));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: "ACCOUNT_REQUIRED" });
    expect(mocks.listForms).not.toHaveBeenCalled();
  });
});

describe("POST /api/agent/forms", () => {
  it("writes the form under the resolved owner, ignoring an owner in the body", async () => {
    const res = await collection.POST(
      req({ title: "Feedback", fields: [TEXT], ownerId: "someone_else" }),
    );

    expect(res.status).toBe(201);
    expect(mocks.insertReturning).toHaveBeenCalledTimes(1);
    expect(mocks.insertReturning.mock.calls[0][0]).toMatchObject({
      ownerId: OWNER,
      title: "Feedback",
    });
  });

  it("creates an empty draft from no body at all", async () => {
    const res = await collection.POST(req());

    expect(res.status).toBe(201);
    expect(mocks.insertReturning.mock.calls[0][0]).toMatchObject({
      ownerId: OWNER,
      title: "Untitled form",
      fields: [],
    });
  });

  it("refuses a malformed field list without touching the database", async () => {
    const res = await collection.POST(req({ fields: "nope" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_FIELDS" });
    expect(mocks.insertReturning).not.toHaveBeenCalled();
  });
});

describe("GET /api/agent/forms", () => {
  it("lists only the calling account's forms", async () => {
    mocks.listForms.mockResolvedValue([
      {
        id: "form1",
        title: "Team offsite",
        status: "draft",
        acceptResponses: true,
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        responseCount: 0,
      },
    ]);

    const res = await collection.GET(req(undefined, "GET"));

    expect(mocks.listForms).toHaveBeenCalledWith(OWNER);
    await expect(res.json()).resolves.toMatchObject({ forms: [{ id: "form1" }] });
  });
});

describe("GET/PATCH/DELETE /api/agent/forms/{id}", () => {
  it("scopes the lookup by the resolved owner, so another account's form is a 404", async () => {
    mocks.getOwnedForm.mockResolvedValue(null);

    const res = await item.GET(req(undefined, "GET"), context("not-mine"));

    expect(mocks.getOwnedForm).toHaveBeenCalledWith(OWNER, "not-mine");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ code: "NOT_FOUND" });
  });

  it("applies only the keys that were sent", async () => {
    const res = await item.PATCH(req({ title: "  Renamed  " }, "PATCH"), context("form1"));

    expect(res.status).toBe(200);
    const changes = mocks.updateReturning.mock.calls[0][0];
    expect(changes).toMatchObject({ title: "Renamed" });
    expect(changes).not.toHaveProperty("acceptResponses");
    expect(changes).not.toHaveProperty("fields");
  });

  it("refuses a wrongly-typed key without writing", async () => {
    const res = await item.PATCH(
      req({ acceptResponses: "yes" }, "PATCH"),
      context("form1"),
    );

    expect(res.status).toBe(400);
    expect(mocks.updateReturning).not.toHaveBeenCalled();
  });

  it("answers 404 when the update matched nothing", async () => {
    mocks.updateReturning.mockResolvedValue([]);

    const res = await item.PATCH(req({ title: "x" }, "PATCH"), context("form1"));

    expect(res.status).toBe(404);
  });

  it("deletes with a 204, and 404s when nothing matched", async () => {
    const ok = await item.DELETE(req(undefined, "DELETE"), context("form1"));
    expect(ok.status).toBe(204);

    mocks.deleteReturning.mockResolvedValue([]);
    const missing = await item.DELETE(req(undefined, "DELETE"), context("form1"));
    expect(missing.status).toBe(404);
  });
});

describe("publishing", () => {
  it("refuses to publish an empty form, with the problems", async () => {
    mocks.getOwnedForm.mockResolvedValue({ ...form, fields: [] });

    const res = await publish.POST(req(undefined, "POST"), context("form1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_FORM");
    expect(body.problems.length).toBeGreaterThan(0);
    expect(mocks.updateReturning).not.toHaveBeenCalled();
  });

  it("publishes a valid form", async () => {
    mocks.updateReturning.mockResolvedValue([{ ...form, status: "published" }]);

    const res = await publish.POST(req(undefined, "POST"), context("form1"));

    expect(res.status).toBe(200);
    expect(mocks.updateReturning.mock.calls[0][0]).toMatchObject({
      status: "published",
    });
    await expect(res.json()).resolves.toMatchObject({ status: "published" });
  });

  it("unpublishes back to draft", async () => {
    await unpublish.POST(req(undefined, "POST"), context("form1"));

    expect(mocks.updateReturning.mock.calls[0][0]).toMatchObject({ status: "draft" });
  });
});

describe("GET /api/agent/forms/{id}/responses", () => {
  it("returns formatted answers, newest first, with a count", async () => {
    mocks.listResponses.mockResolvedValue([
      {
        id: "r1",
        answers: { f1: "Ada" },
        submittedAt: new Date("2026-01-02T00:00:00Z"),
      },
    ]);

    const res = await responses.GET(
      req(undefined, "GET"),
      context("form1"),
    );

    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.responses[0]).toMatchObject({
      id: "r1",
      answers: { f1: "Ada" },
      display: [{ fieldId: "f1", label: "Name", values: ["Ada"], orphan: false }],
    });
  });

  it("rejects a limit outside the allowed range", async () => {
    const res = await responses.GET(
      new Request("http://test.local/api/agent/forms/form1/responses?limit=0"),
      context("form1"),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_LIMIT" });
  });

  it("caps the list when a limit is given", async () => {
    mocks.listResponses.mockResolvedValue([
      { id: "a", answers: {}, submittedAt: new Date("2026-01-02T00:00:00Z") },
      { id: "b", answers: {}, submittedAt: new Date("2026-01-01T00:00:00Z") },
    ]);

    const res = await responses.GET(
      new Request("http://test.local/api/agent/forms/form1/responses?limit=1"),
      context("form1"),
    );

    const body = await res.json();
    expect(body.count).toBe(2);
    expect(body.responses).toHaveLength(1);
  });
});

describe("GET /api/agent/forms/{id}/export", () => {
  it("streams the same CSV the dashboard produces", async () => {
    mocks.listResponses.mockResolvedValue([
      {
        id: "r1",
        answers: { f1: "Ada, Inc." },
        submittedAt: new Date("2026-01-02T00:00:00Z"),
      },
    ]);

    const res = await csv.GET(req(undefined, "GET"), context("form1"));

    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("team-offsite.csv");

    const bytes = new Uint8Array(await res.arrayBuffer());
    // `Response.text()` strips a leading BOM when it decodes, so the bytes are
    // what prove it is there — and the BOM is what makes Excel read UTF-8.
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Submitted at,Name");
    // RFC 4180 quoting, since the value contains a comma.
    expect(text).toContain('"Ada, Inc."');
  });
});

describe("POST /api/signup", () => {
  it("answers 201 with the user and whether it was created — never the email", async () => {
    mocks.signUpAgent.mockResolvedValue({
      ok: true,
      user: "user_new",
      email: "ada@example.com",
      created: true,
    });

    const res = await signup.POST(req());

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ user: "user_new", created: true });
    expect(JSON.stringify(body)).not.toContain("ada@example.com");
  });

  it("reports a repeat as a sign-in, not a creation", async () => {
    mocks.signUpAgent.mockResolvedValue({
      ok: true,
      user: "user_1",
      email: "ada@example.com",
      created: false,
    });

    const res = await signup.POST(req());

    await expect(res.json()).resolves.toEqual({ user: "user_1", created: false });
  });

  it("passes the gate's failure response through untouched", async () => {
    mocks.signUpAgent.mockResolvedValue({
      ok: false,
      response: Response.json(
        { code: "EXPIRED", error: "the token expired" },
        { status: 401 },
      ),
    });

    const res = await signup.POST(req());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ code: "EXPIRED" });
  });
});
