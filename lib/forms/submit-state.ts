/**
 * Shared submit-result shape. Lives outside the "use server" module because a
 * server action file may only export async functions.
 */
export type SubmitState = {
  /** Field id to message. Empty means no field errors. */
  errors: Record<string, string>;
  /** Set when the form itself refused the submission. */
  formError?: string;
  /**
   * What the respondent typed, echoed back on failure. The browser keeps
   * uncontrolled values on its own when React re-renders in place, but a no-JS
   * submit gets a whole new page back — this is what stops that from wiping the
   * form. See docs/design.md.
   */
  values?: Record<string, string | string[]>;
};

export const INITIAL_SUBMIT_STATE: SubmitState = { errors: {} };
