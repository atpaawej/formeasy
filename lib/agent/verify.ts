import {
  createAgentAccount,
  verifyAgentAccount,
  type AccountCreator,
  type AccountErrorCode,
  type AccountResolver,
  type VerifyAgentTokenOptions,
} from "@agentonboard/sdk";

import { agentAudience, agentIssuer } from "./config";

/*
 * The agent gate, in one place.
 *
 * The SDK's `verifyAgentAccount` does the cryptography; this module owns the two
 * decisions around it that are ours and that every agent route must agree on:
 *
 *   - which audience and issuer a token is checked against (configuration, never
 *     the request — see lib/agent/config.ts);
 *   - which HTTP status a failure code becomes, and what the body says.
 *
 * Routes stay thin plumbing, and the whole contract is testable with a pinned
 * key set and no network. That mirrors `lib/forms/submit.ts`: push the decisions
 * out of the handler so they can be exercised without a request.
 */

/**
 * The status a failure code becomes. Copied from the published rule rather than
 * defaulted, because the three exceptions are the whole point:
 *
 *   - `ACCOUNT_REQUIRED` is **403**. The token verified and the account is
 *     missing, which is not an authentication failure — a 401 would tell the
 *     agent to re-authenticate, which can never create an account, and hide the
 *     one action that works.
 *   - `RESOLVER_ERROR` and `CONFIG_ERROR` are **500**. Nobody's request is
 *     wrong; it is our lookup or our configuration that failed.
 *   - everything else is **401**, uniformly. A missing header, a bad signature,
 *     an expired token, the wrong audience, an unknown key, and a dead key
 *     endpoint all mean one thing, and splitting them hands a prober a map.
 *
 * See https://agentonboard.xyz/docs/errors and the conformance vector's
 * `statusMapping`.
 */
export function statusForAgentCode(code: AccountErrorCode): number {
  if (code === "ACCOUNT_REQUIRED") return 403;
  if (code === "RESOLVER_ERROR" || code === "CONFIG_ERROR") return 500;
  return 401;
}

/**
 * The failure body. `code` is the stable thing an agent branches on; `error` is
 * one sentence for a human. Publishing the specific code is deliberate — a code
 * an agent cannot branch on is not a code — and it also tells a prober which
 * check they failed. It carries no token and no email either way.
 */
export function agentFailureResponse(code: AccountErrorCode, error: string): Response {
  return Response.json({ code, error }, { status: statusForAgentCode(code) });
}

/** The request shape the gate reads: a header bag, and nothing else. */
export type AgentRequestLike = {
  readonly headers: { get(name: string): string | null | undefined };
};

/**
 * A pinned key set, for an air-gapped issuer and for tests with no network. The
 * route handlers never pass one; only a caller that already decides its own key
 * source does, which is why it is not on the route-facing options below.
 */
export type AgentKeySource = Pick<VerifyAgentTokenOptions, "jwks" | "fetchJwks">;

type GateOptions<TUser> = {
  audience?: string;
  issuer?: string;
  resolveAccount: AccountResolver<TUser>;
  /** Tests and air-gapped issuers only. */
  keySource?: AgentKeySource;
};

export type AgentAuth<TUser> =
  | { ok: true; user: TUser }
  | { ok: false; response: Response };

/**
 * Verify the bearer token on a request and map the verified email to our own
 * user id. Every agent route starts here.
 *
 * On success the caller gets one thing: our user id. The email, the token, and
 * its claims stay behind this boundary, so the query a handler can write is
 * scoped by our id or not at all.
 */
export async function authenticateAgent<TUser>(
  request: AgentRequestLike,
  options: GateOptions<TUser>,
): Promise<AgentAuth<TUser>> {
  const outcome = await verifyAgentAccount<TUser>({
    token: request.headers.get("authorization") ?? "",
    audience: options.audience ?? agentAudience(),
    issuer: options.issuer ?? agentIssuer(),
    resolveAccount: options.resolveAccount,
    ...options.keySource,
  });

  if (!outcome.ok) {
    return { ok: false, response: agentFailureResponse(outcome.code, outcome.error) };
  }
  return { ok: true, user: outcome.user };
}

export type AgentSignUp<TUser> =
  | { ok: true; user: TUser; email: string; created: boolean }
  | { ok: false; response: Response };

/**
 * The one endpoint that may mint an account. It lives apart from
 * `authenticateAgent` on purpose: wrapping every route in it would create an
 * account as a side effect of whatever request an agent happened to make,
 * including a read. Switching to it is the opt-in, and it is greppable.
 *
 * The token is verified before either callback runs, so a forged or expired
 * token reaches neither the lookup nor the insert. `created` distinguishes
 * "signed in" from "signed up" for the caller's own audit trail.
 */
export async function createAccountForAgent<TUser>(
  request: AgentRequestLike,
  options: GateOptions<TUser> & { createAccount: AccountCreator<TUser> },
): Promise<AgentSignUp<TUser>> {
  const outcome = await createAgentAccount<TUser>({
    token: request.headers.get("authorization") ?? "",
    audience: options.audience ?? agentAudience(),
    issuer: options.issuer ?? agentIssuer(),
    resolveAccount: options.resolveAccount,
    createAccount: options.createAccount,
    ...options.keySource,
  });

  if (!outcome.ok) {
    // `createAgentAccount` cannot report ACCOUNT_REQUIRED — a miss is what it is
    // for — so the shared mapping is already correct here.
    return { ok: false, response: agentFailureResponse(outcome.code, outcome.error) };
  }
  return {
    ok: true,
    user: outcome.user,
    email: outcome.email,
    created: outcome.created,
  };
}
