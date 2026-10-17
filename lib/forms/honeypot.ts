/*
 * The honeypot.
 *
 * A field planted in the public form that no human can see, reach by keyboard,
 * or read from a screen reader, and that carries a name a form-filler has no
 * reason to recognize. A script that answers every input it finds answers this
 * one too, and names itself.
 *
 * The name lives here rather than in the submit module so the form can import it
 * without dragging `node:crypto` (and the rest of the server-side submit path)
 * into the client bundle. Same rule as `submit-state.ts`.
 *
 * Honeypots catch the naive end of the bot spectrum, which is most of it. The
 * rate limit catches the rest; neither is a captcha, and neither is meant to be.
 */

export const HONEYPOT_FIELD = "formeasy_gotcha";

/**
 * True when the honeypot came back filled.
 *
 * Whitespace-only does not count: some password managers and autofill heuristics
 * have been known to drop a space into a field nobody touched, and refusing a
 * real person's answer to catch that is the worse trade.
 */
export function honeypotTripped(formData: FormData): boolean {
  const value = formData.get(HONEYPOT_FIELD);
  return typeof value === "string" && value.trim() !== "";
}
