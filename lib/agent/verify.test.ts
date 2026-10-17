import { normalizeAudience, verifyAgentToken } from "@agentonboard/sdk";
import type { VerifyAgentTokenOptions } from "@agentonboard/sdk";
import { describe, expect, it, vi } from "vitest";

import rawVector from "@agentonboard/sdk/vectors/agent-token-v1.json";

import { authenticateAgent, createAccountForAgent, statusForAgentCode } from "./verify";

/*
 * The agent gate, pinned to AgentOnboard's own cross-language conformance vector.
 *
 * The vector carries fixture keys and real RS256 tokens — one correct, and one
 * for each way a token can be wrong. Passing them to the SDK with the keys pinned
 * means these tests touch no network and no clock: the happy token expires in
 * 2100 and the expired one expired in 2020. See the SDK's `jwks` option.
 *
 * What is ours, and therefore what these tests are really for: which audience a
 * token is checked against, and which HTTP status each failure becomes. The
 * crypto is the SDK's.
 */

type Case =
  | {
      name: string;
      keySet: string;
      token: string;
      audience: string;
      issuer: string;
      expect: { ok: true; email?: string; sub?: string; jti?: string };
    }
  | {
      name: string;
      keySet: string;
      token: string;
      audience: string;
      issuer: string;
      expect: { ok: false; code: string };
    };

type Jwks = NonNullable<VerifyAgentTokenOptions["jwks"]>;

type Vector = {
  keys: Record<string, { kid: string; jwks: Jwks }>;
  audienceNormalization: { input: string; expected: string }[];
  verification: Case[];
  statusMapping: { default: number; overrides: { code: string; status: number }[] };
};

const vector = rawVector as unknown as Vector;

const HAPPY = vector.verification.find(
  (item) => item.name === "happy_path_far_future_exp",
) as Extract<Case, { expect: { ok: true } }>;

const AUDIENCE = HAPPY.audience;
const ISSUER = HAPPY.issuer;

function keysFor(name: string) {
  return vector.keys[name].jwks;
}

/** A request carrying the token the way a caller sends it. */
function bearer(token: string) {
  return { headers: new Headers({ authorization: `Bearer ${token}` }) };
}

/** The gate options that make a token verifiable with no network. */
function pinned() {
  return { audience: AUDIENCE, issuer: ISSUER, keySource: { jwks: keysFor("active") } };
}

describe("the SDK contract this integration stands on", () => {
  it("verifies every conformance token as the vector says it does", async () => {
    for (const item of vector.verification) {
      const result = await verifyAgentToken({
        token: item.token,
        audience: item.audience,
        issuer: item.issuer,
        jwks: keysFor(item.keySet),
      });

      expect(result.ok, item.name).toBe(item.expect.ok);
      if (result.ok && item.expect.ok) {
        // The vector pins only the fields a case is about.
        if (item.expect.jti) expect(result.jti, item.name).toBe(item.expect.jti);
        if (item.expect.email) expect(result.email, item.name).toBe(item.expect.email);
      }
      if (!result.ok && !item.expect.ok) {
        expect(result.code, item.name).toBe(item.expect.code);
      }
    }
  });

  it("normalizes an audience the way our configuration depends on", () => {
    for (const item of vector.audienceNormalization) {
      expect(normalizeAudience(item.input), item.input).toBe(item.expected);
    }
  });
});

describe("statusForAgentCode", () => {
  it("answers 401 for everything except the three published overrides", () => {
    const overrides = new Map(
      vector.statusMapping.overrides.map((o) => [o.code, o.status] as const),
    );

    for (const item of vector.verification) {
      if (item.expect.ok) continue;
      expect(statusForAgentCode(item.expect.code as never), item.name).toBe(
        overrides.get(item.expect.code) ?? vector.statusMapping.default,
      );
    }
  });

  it("puts ACCOUNT_REQUIRED on 403 and our own failures on 500", () => {
    expect(statusForAgentCode("ACCOUNT_REQUIRED")).toBe(403);
    expect(statusForAgentCode("RESOLVER_ERROR")).toBe(500);
    expect(statusForAgentCode("CONFIG_ERROR")).toBe(500);
  });
});

describe("authenticateAgent", () => {
  it("hands the resolver the verified email, verbatim, exactly once", async () => {
    const resolveAccount = vi.fn().mockResolvedValue("user_1");

    const auth = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount,
    });

    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.user).toBe("user_1");
    expect(resolveAccount).toHaveBeenCalledTimes(1);
    expect(resolveAccount).toHaveBeenCalledWith({ email: HAPPY.expect.email });
  });

  it("returns our own user id, and nothing about the token", async () => {
    const auth = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => "user_1",
    });

    expect(auth).toEqual({ ok: true, user: "user_1" });
  });

  it("answers 403 ACCOUNT_REQUIRED when the email has no account", async () => {
    const auth = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => null,
    });

    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.response.status).toBe(403);
    await expect(auth.response.json()).resolves.toMatchObject({
      code: "ACCOUNT_REQUIRED",
    });
  });

  it("treats undefined and null the same, and treats 0 as a real id", async () => {
    for (const value of [null, undefined]) {
      const auth = await authenticateAgent(bearer(HAPPY.token), {
        ...pinned(),
        resolveAccount: async () => value,
      });
      expect(auth.ok).toBe(false);
    }

    const zero = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => 0,
    });
    expect(zero).toEqual({ ok: true, user: 0 });
  });

  it("reports a resolver that threw as our 500, and echoes nothing it threw", async () => {
    const auth = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => {
        throw new Error("postgres://user:hunter2@db.internal:5432/formeasy");
      },
    });

    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.response.status).toBe(500);

    const body = await auth.response.text();
    expect(body).toContain("RESOLVER_ERROR");
    expect(body).not.toContain("hunter2");
    expect(body).not.toContain("postgres://");
    expect(body).not.toContain("db.internal");
  });

  it("never reaches the resolver for an expired token", async () => {
    const expired = vector.verification.find((c) => c.name === "expired_token")!;
    const resolveAccount = vi.fn().mockResolvedValue("user_1");

    const auth = await authenticateAgent(bearer(expired.token), {
      ...pinned(),
      resolveAccount,
    });

    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
    expect(resolveAccount).not.toHaveBeenCalled();
  });

  it("rejects a genuine token minted for a different audience", async () => {
    const auth = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      audience: "someone-else.com",
      resolveAccount: async () => "user_1",
    });

    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.response.status).toBe(401);
    await expect(auth.response.json()).resolves.toMatchObject({
      code: "AUDIENCE_MISMATCH",
    });
  });

  it("rejects a suffix of our own audience, which is the replay case", async () => {
    const auth = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      audience: `${AUDIENCE}.evil.com`,
      resolveAccount: async () => "user_1",
    });

    expect(auth.ok).toBe(false);
  });

  it("rejects a request with no Authorization header at all", async () => {
    const auth = await authenticateAgent(
      { headers: new Headers() },
      { ...pinned(), resolveAccount: async () => "user_1" },
    );

    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it("fails closed when no audience is configured", async () => {
    const previous = process.env.AON_AUDIENCE;
    delete process.env.AON_AUDIENCE;

    try {
      const resolveAccount = vi.fn();
      const auth = await authenticateAgent(bearer(HAPPY.token), {
        keySource: { jwks: keysFor("active") },
        resolveAccount,
      });

      // CONFIG_ERROR is ours, not the caller's, so it is a 500 — and no token is
      // ever treated as valid because the configuration was missing.
      expect(auth.ok).toBe(false);
      if (!auth.ok) expect(auth.response.status).toBe(500);
      expect(resolveAccount).not.toHaveBeenCalled();
    } finally {
      if (previous !== undefined) process.env.AON_AUDIENCE = previous;
    }
  });
});

describe("createAccountForAgent", () => {
  it("creates on a miss and says so", async () => {
    const createAccount = vi.fn().mockResolvedValue("user_new");

    const outcome = await createAccountForAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => null,
      createAccount,
    });

    expect(outcome).toMatchObject({ ok: true, user: "user_new", created: true });
    expect(createAccount).toHaveBeenCalledWith({ email: HAPPY.expect.email });
  });

  it("signs in on a hit without calling the creator", async () => {
    const createAccount = vi.fn();

    const outcome = await createAccountForAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => "user_1",
      createAccount,
    });

    expect(outcome).toMatchObject({ ok: true, user: "user_1", created: false });
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("reaches neither callback for a forged token", async () => {
    const forged = vector.verification.find(
      (c) => c.name === "signature_from_another_key_with_matching_kid",
    )!;
    const resolveAccount = vi.fn();
    const createAccount = vi.fn();

    const outcome = await createAccountForAgent(bearer(forged.token), {
      audience: AUDIENCE,
      issuer: ISSUER,
      keySource: { jwks: keysFor(forged.keySet) },
      resolveAccount,
      createAccount,
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.response.status).toBe(401);
    expect(resolveAccount).not.toHaveBeenCalled();
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("reports a throwing creator as our 500, never as ACCOUNT_REQUIRED", async () => {
    const outcome = await createAccountForAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount: async () => null,
      createAccount: async () => {
        throw new Error("users_email_unique: duplicate key");
      },
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.response.status).toBe(500);

    const body = await outcome.response.text();
    expect(body).toContain("RESOLVER_ERROR");
    expect(body).not.toContain("users_email_unique");
  });
});

describe("the whole lifecycle an agent walks", () => {
  it("goes unknown → ACCOUNT_REQUIRED → signup → served", async () => {
    // One email, one account, keyed exactly the way Clerk is.
    const accounts = new Map<string, string>();

    const resolveAccount = async ({ email }: { email: string }) =>
      accounts.get(email.toLowerCase()) ?? null;

    // 1. The first call: a real token, no account yet.
    const first = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount,
    });
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.response.status).toBe(403);

    // 2. auth.md points the agent at signup. It creates the account.
    const signup = await createAccountForAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount,
      createAccount: async ({ email }) => {
        const id = "user_created";
        accounts.set(email.toLowerCase(), id);
        return id;
      },
    });
    expect(signup).toMatchObject({ ok: true, created: true });

    // 3. The retry is served.
    const retry = await authenticateAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount,
    });
    expect(retry).toEqual({ ok: true, user: "user_created" });

    // 4. Signing up again signs in; no duplicate is possible.
    const again = await createAccountForAgent(bearer(HAPPY.token), {
      ...pinned(),
      resolveAccount,
      createAccount: async () => {
        throw new Error("must not be called");
      },
    });
    expect(again).toMatchObject({ ok: true, user: "user_created", created: false });
    expect(accounts.size).toBe(1);
  });
});
