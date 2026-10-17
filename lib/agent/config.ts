/*
 * Agent access (AgentOnboard) configuration. See docs/design.md.
 *
 * An agent presents a short-lived RS256 token minted for this deployment's
 * hostname; we verify it locally against AgentOnboard's public keys and map the
 * verified email to a Clerk user. Nothing here round-trips to AgentOnboard.
 */

/**
 * The audience an AgentOnboard token must carry: the bare hostname this
 * deployment serves on, exactly as it appears in the `## Audience` line of
 * `/auth.md`.
 *
 * A literal in *configuration*, never read off the request. An audience the
 * caller controls is not a check — it is an instruction, and obeying it is how
 * a token minted for someone else's service gets accepted here. That is also
 * why this is not derived from `Host`: the same request could ask us to trust
 * any audience it liked.
 *
 * Empty means agent access is switched off. Requests fail closed — the SDK
 * reports `CONFIG_ERROR` (500) — and `/auth.md` 404s rather than advertising a
 * capability this deployment does not have.
 */
export function agentAudience(): string {
  return process.env.AON_AUDIENCE?.trim() ?? "";
}

/**
 * Staging and self-hosted identity engines publish keys somewhere other than
 * production. The SDK reads `AON_ISSUER` itself as the default for both the
 * `iss` check and the key host, so this exists only to name it in one place.
 */
export function agentIssuer(): string | undefined {
  return process.env.AON_ISSUER?.trim() || undefined;
}
