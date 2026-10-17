import { and, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { forms, responses } from "@/lib/db/schema";
import type { Answers } from "@/lib/fields";

export type FormSummary = {
  id: string;
  title: string;
  status: string;
  acceptResponses: boolean;
  updatedAt: Date;
  responseCount: number;
};

export async function listForms(ownerId: string): Promise<FormSummary[]> {
  return db
    .select({
      id: forms.id,
      title: forms.title,
      status: forms.status,
      acceptResponses: forms.acceptResponses,
      updatedAt: forms.updatedAt,
      responseCount: sql<number>`count(${responses.id})::int`,
    })
    .from(forms)
    .leftJoin(responses, eq(responses.formId, forms.id))
    .where(eq(forms.ownerId, ownerId))
    .groupBy(forms.id)
    .orderBy(desc(forms.updatedAt));
}

export async function getOwnedForm(ownerId: string, id: string) {
  const [row] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

export async function getFormById(id: string) {
  const [row] = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return row ?? null;
}

export async function countResponses(formId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(responses)
    .where(eq(responses.formId, formId));
  return row?.count ?? 0;
}

export type ResponseRow = {
  id: string;
  answers: Answers;
  submittedAt: Date;
};

/**
 * Every response to a form, newest first. One query serves both the list and the
 * CSV export; the export re-sorts ascending because a spreadsheet reads better
 * as a timeline. Rows are not paginated yet — see the backlog in the roadmap.
 */
export async function listResponses(formId: string): Promise<ResponseRow[]> {
  return db
    .select({
      id: responses.id,
      answers: responses.answers,
      submittedAt: responses.submittedAt,
    })
    .from(responses)
    .where(eq(responses.formId, formId))
    .orderBy(desc(responses.submittedAt));
}

/**
 * How many times one (IP, form) has answered since `since` — the counter behind
 * the rate limit in lib/forms/submit.ts.
 *
 * `meta.ipHash` is written on every response from day one, and the
 * `(form_id, submitted_at)` index carries the rest, so this is one indexed count
 * and needs no table of its own. Only ever called with a hash, never with an
 * address: the raw IP exists for the length of one request and is not stored.
 */
export async function countRecentResponses(
  formId: string,
  ipHash: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(responses)
    .where(
      and(
        eq(responses.formId, formId),
        gt(responses.submittedAt, since),
        sql`${responses.meta} ->> 'ipHash' = ${ipHash}`,
      ),
    );

  return row?.count ?? 0;
}
