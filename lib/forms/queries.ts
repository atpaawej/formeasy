import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { forms, responses } from "@/lib/db/schema";

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
