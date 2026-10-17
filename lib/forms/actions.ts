"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { validateFormForPublish } from "@/lib/fields";
import { cleanDraft, cleanTitle, type FormDraft } from "@/lib/forms/draft";
import { newFormId } from "@/lib/ids";
import { reportError } from "@/lib/observability";

/*
 * Every action re-checks auth itself. Server Functions are reachable by direct
 * POST, and a proxy matcher change can silently drop coverage. See AGENTS.md.
 */
async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

/*
 * A write that reports its own failure before throwing.
 *
 * The builder already tells the user when a save did not land, but that
 * indicator is the only trace of it: the action throws, the client catches, and
 * nothing is written down. This is that missing line, and it stays out of the
 * way — the error is rethrown, so every caller behaves exactly as before.
 *
 * Only the write is wrapped, never the redirect that may follow it: a redirect
 * is control flow, and the framework throws it.
 */
async function write<T>(where: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    reportError(error, { where });
    throw error;
  }
}

export async function createForm() {
  const ownerId = await requireUserId();
  const id = newFormId();

  await write("createForm", () => db.insert(forms).values({ id, ownerId }));
  revalidatePath("/dashboard");
  redirect(`/dashboard/forms/${id}/edit`);
}

export async function saveForm(formId: string, input: FormDraft): Promise<void> {
  const ownerId = await requireUserId();
  const draft = cleanDraft(input);

  await write("saveForm", () =>
    db
      .update(forms)
      .set({ ...draft, updatedAt: new Date() })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId))),
  );
}

export async function renameForm(formId: string, title: string): Promise<void> {
  const ownerId = await requireUserId();
  await write("renameForm", () =>
    db
      .update(forms)
      .set({
        title: cleanTitle(title),
        updatedAt: new Date(),
      })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId))),
  );
  revalidatePath("/dashboard");
}

export async function deleteForm(formId: string): Promise<void> {
  const ownerId = await requireUserId();
  await write("deleteForm", () =>
    db
      .delete(forms)
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId))),
  );
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

  await write("publishForm", () =>
    db
      .update(forms)
      .set({ ...draft, status: "published", updatedAt: new Date() })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId))),
  );

  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function unpublishForm(formId: string): Promise<void> {
  const ownerId = await requireUserId();
  await write("unpublishForm", () =>
    db
      .update(forms)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId))),
  );
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
  await write("setAcceptResponses", () =>
    db
      .update(forms)
      .set({ acceptResponses: accept, updatedAt: new Date() })
      .where(and(eq(forms.id, formId), eq(forms.ownerId, ownerId))),
  );

  revalidatePath(`/dashboard/forms/${formId}`);
  revalidatePath(`/dashboard/forms/${formId}/edit`);
  revalidatePath("/dashboard");
}
