"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import {
  parseFields,
  validateFormForPublish,
  type Field,
} from "@/lib/fields";
import { newFormId } from "@/lib/ids";

/*
 * Every action re-checks auth itself. Server Functions are reachable by direct
 * POST, and a proxy matcher change can silently drop coverage. See AGENTS.md.
 */
async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;

export type FormDraft = {
  title: string;
  description: string;
  fields: Field[];
};

function cleanDraft(input: FormDraft) {
  const fields = parseFields(input.fields);
  if (!fields) throw new Error("Invalid fields payload");
  return {
    title: input.title.trim().slice(0, MAX_TITLE) || "Untitled form",
    description: input.description.trim().slice(0, MAX_DESCRIPTION),
    fields,
  };
}

export async function createForm() {
  const ownerId = await requireUserId();
  const id = newFormId();

  await db.insert(forms).values({ id, ownerId });
  revalidatePath("/dashboard");
  redirect(`/dashboard/forms/${id}/edit`);
}

export async function saveForm(formId: string, input: FormDraft): Promise<void> {
  const ownerId = await requireUserId();
  const draft = cleanDraft(input);

  await db
    .update(forms)
    .set({ ...draft, updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId)));
}

export async function renameForm(formId: string, title: string): Promise<void> {
  const ownerId = await requireUserId();
  await db
    .update(forms)
    .set({ title: title.trim().slice(0, MAX_TITLE) || "Untitled form", updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId)));
  revalidatePath("/dashboard");
}

export async function deleteForm(formId: string): Promise<void> {
  const ownerId = await requireUserId();
  await db
    .delete(forms)
    .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId)));
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export type PublishResult =
  | { ok: true }
  | { ok: false; problems: string[] };

/**
 * Publishing validates and saves in one step, so a pending autosave can't be
 * dropped between the click and the write.
 */
export async function publishForm(
  formId: string,
  input: FormDraft,
): Promise<PublishResult> {
  const ownerId = await requireUserId();
  const draft = cleanDraft(input);

  const problems = validateFormForPublish(draft.fields);
  if (problems.length > 0) return { ok: false, problems };

  await db
    .update(forms)
    .set({ ...draft, status: "published", updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId)));

  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function unpublishForm(formId: string): Promise<void> {
  const ownerId = await requireUserId();
  await db
    .update(forms)
    .set({ status: "draft", updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId)));
  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
}

/**
 * Close or reopen a published form. `accept_responses` is the only thing that
 * changes: the form stays viewable, and its public link keeps working — a
 * closed form says so instead of 404ing. See docs/design.md.
 */
export async function setAcceptResponses(
  formId: string,
  accept: boolean,
): Promise<void> {
  const ownerId = await requireUserId();
  await db
    .update(forms)
    .set({ acceptResponses: accept, updatedAt: new Date() })
    .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId)));

  revalidatePath(`/dashboard/forms/${formId}`);
  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
}
