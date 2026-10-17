import { reportError } from "@/lib/observability";

/*
 * The small shared vocabulary of an agent-facing JSON route: a problem body, a
 * JSON reader, and one wrapper that turns an unexpected failure into a sentence
 * while the cause goes to the log.
 *
 * The failure body is `{ code, error }` throughout — the same shape the auth gate
 * returns — so an agent has one thing to branch on, not two.
 */

/** A JSON error body. `code` is stable; `error` is a sentence for a human. */
export function problem(status: number, code: string, error: string): Response {
  return Response.json({ code, error }, { status });
}

/**
 * Parse a request body, answering `undefined` for anything that is not JSON —
 * an empty body, a form post, a truncated payload. The caller decides whether
 * that is a 400 or something else.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * Run a route body, reporting an unexpected throw and answering it as ours.
 *
 * A failure the caller cannot act on becomes "try again"; the driver message,
 * the connection string, and the stack go to `reportError`, where someone can act
 * on them. The auth gate handles its own failures, so this never sees them.
 */
export async function agentRoute(
  where: string,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    reportError(error, { where });
    return problem(500, "INTERNAL", "Something went wrong. Please try again.");
  }
}
