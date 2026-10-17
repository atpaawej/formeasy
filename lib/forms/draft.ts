import { parseFields, type Field } from "@/lib/fields";

/*
 * A form draft, cleaned in one place.
 *
 * The builder's autosave (a Server Action) and the agent API both write the same
 * shape, so the rule for what a title, a description, and a field list may be
 * lives here rather than in either caller. A Server Action can only export async
 * functions, so this cannot live in lib/forms/actions.ts even though that is
 * where it is used. See AGENTS.md: push decisions out of server actions.
 */

export type FormDraft = {
  title: string;
  description: string;
  fields: Field[];
};

export const MAX_TITLE = 200;
export const MAX_DESCRIPTION = 2000;

/** A blank title is not an error — it is the default, everywhere. */
export function cleanTitle(value: string): string {
  return value.trim().slice(0, MAX_TITLE) || "Untitled form";
}

export function cleanDescription(value: string): string {
  return value.trim().slice(0, MAX_DESCRIPTION);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalize a draft. Throws when `fields` is not a well-formed field list. */
export function cleanDraft(input: FormDraft) {
  const fields = parseFields(input.fields);
  if (!fields) throw new Error("Invalid fields payload");
  return {
    title: cleanTitle(input.title),
    description: cleanDescription(input.description),
    fields,
  };
}

/**
 * Read a draft off an untrusted JSON body.
 *
 * Absent keys are the defaults, not errors: an agent that creates a form with no
 * body gets an empty, untitled draft. A `fields` key that is present but not a
 * well-formed field list is the one thing that returns null, because guessing at
 * it would store a form the builder cannot open.
 */
export function parseDraftInput(value: unknown): FormDraft | null {
  if (!isRecord(value)) return null;

  const title = value.title ?? "";
  const description = value.description ?? "";
  if (typeof title !== "string" || typeof description !== "string") return null;

  const fields = value.fields === undefined ? [] : parseFields(value.fields);
  if (fields === null) return null;

  return { title, description, fields };
}

/** An update: only the keys that were sent are changed. */
export type DraftPatch = {
  title?: string;
  description?: string;
  fields?: Field[];
  acceptResponses?: boolean;
};

/**
 * Read a partial update off an untrusted JSON body, or null when a key is
 * present with the wrong shape. `status` is deliberately not accepted here:
 * publishing validates, so it has its own endpoint.
 */
export function parseDraftPatch(value: unknown): DraftPatch | null {
  if (!isRecord(value)) return null;

  const patch: DraftPatch = {};

  if ("title" in value) {
    if (typeof value.title !== "string") return null;
    patch.title = value.title;
  }
  if ("description" in value) {
    if (typeof value.description !== "string") return null;
    patch.description = value.description;
  }
  if ("fields" in value) {
    const fields = parseFields(value.fields);
    if (fields === null) return null;
    patch.fields = fields;
  }
  if ("acceptResponses" in value) {
    if (typeof value.acceptResponses !== "boolean") return null;
    patch.acceptResponses = value.acceptResponses;
  }

  return patch;
}
