import { createClerkAccount, resolveClerkAccount } from "./accounts";
import {
  authenticateAgent,
  createAccountForAgent,
  type AgentAuth,
  type AgentRequestLike,
  type AgentSignUp,
} from "./verify";

/*
 * The app's wiring for the agent gate: the shared verifier, told which account
 * lookup to use. Routes import from here, so the pair of callbacks is named in
 * one place and a route cannot accidentally pair a verifier with the wrong
 * resolver.
 */

/** Verify an agent request and resolve it to a Clerk user id. */
export function requireAgentUser(
  request: AgentRequestLike,
): Promise<AgentAuth<string>> {
  return authenticateAgent(request, { resolveAccount: resolveClerkAccount });
}

/** The signup handler's gate: verify, then find or create the Clerk user. */
export function signUpAgent(
  request: AgentRequestLike,
): Promise<AgentSignUp<string>> {
  return createAccountForAgent(request, {
    resolveAccount: resolveClerkAccount,
    createAccount: createClerkAccount,
  });
}
