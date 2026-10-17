/*
 * Error tracking, in one place.
 *
 * Every failure that is ours — not the respondent's — goes through
 * `reportError`: the error boundaries, the submit path, the export route. A call
 * site never decides how a failure is recorded, so swapping the sink for a
 * hosted service later is one edit here and none at the call sites.
 *
 * The sink is a single JSON line on stderr, which every host captures; Vercel's
 * log view and log drains both read it, and it is greppable locally. Set
 * `ERROR_REPORT_URL` and the same payload is also POSTed there, best-effort: the
 * log line is the durable record, and a reporter that can fail the request it is
 * reporting on would be worse than no reporter.
 *
 * The payload carries a name, a message, a stack, and whatever the call site
 * knows about the moment. It never carries an answer or an address — the caller
 * passes ids, not content. See docs/design.md.
 */

export type ErrorSample = {
  name: string;
  message: string;
  stack?: string;
};

export type ErrorReport = ErrorSample & {
  context: Record<string, unknown>;
  /** ISO 8601, UTC — the same clock the rest of the app uses. */
  at: string;
};

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    // A circular whatever. The message is still worth having.
    return String(value);
  }
}

/** The parts of a thrown value worth recording, narrowed: anything can be thrown. */
export function describeError(error: unknown): ErrorSample {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "UnknownError", message: stringify(error) };
}

export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
): ErrorReport {
  const report: ErrorReport = {
    ...describeError(error),
    context,
    at: new Date().toISOString(),
  };

  console.error(JSON.stringify(report));

  const endpoint = process.env.ERROR_REPORT_URL;
  if (endpoint) void forward(endpoint, report);

  return report;
}

async function forward(endpoint: string, report: ErrorReport): Promise<void> {
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
      cache: "no-store",
    });
  } catch {
    // Best-effort by design; the log line above already has it.
  }
}
