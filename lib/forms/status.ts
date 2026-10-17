export type FormStatus = "draft" | "published" | "closed";

export const FORM_STATUS_LABEL: Record<FormStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

/**
 * A closed form is a published form that stopped accepting responses. It stays
 * viewable — only submission is off. See docs/design.md.
 */
export function formStatus(
  status: string,
  acceptResponses: boolean,
): FormStatus {
  if (status !== "published") return "draft";
  return acceptResponses ? "published" : "closed";
}
