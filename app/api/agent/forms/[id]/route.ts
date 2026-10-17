import { and, eq } from "drizzle-orm";

import { agentRoute, problem, readJsonBody } from "@/lib/agent/http";
import { formPayload } from "@/lib/agent/payload";
import { requireAgentUser } from "@/lib/agent/session";
import { db } from "@/lib/db";
import { forms, type NewForm } from "@/lib/db/schema";
import {
  cleanDescription,
  cleanTitle,
  parseDraftPatch,
} from "@/lib/forms/draft";
import { getOwnedForm } from "@/lib/forms/queries";

/*
 * GET    /api/agent/forms/{id} — the form, including its fields.
 * PATCH  /api/agent/forms/{id} — change title, description, fields, or whether
 *                                it is accepting responses.
 * DELETE /api/agent/forms/{id} — remove it and its responses.
 *
 * Every statement is scoped by `ownerId`, so a form id belonging to someone else
 * is indistinguishable from one that does not exist: both are a 404. `status` is
 * not settable here — publishing validates, so it has its own endpoints.
 */

const NOT_FOUND = "No form with that id.";

export async function GET(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]">,
) {
  return agentRoute("agentGetForm", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const form = await getOwnedForm(auth.user, id);
    if (!form) return problem(404, "NOT_FOUND", NOT_FOUND);

    return Response.json(formPayload(form));
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]">,
) {
  return agentRoute("agentUpdateForm", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const patch = parseDraftPatch((await readJsonBody(request)) ?? {});
    if (!patch) {
      return problem(
        400,
        "INVALID_BODY",
        "A supplied key has the wrong shape, or `fields` is not a well-formed field list.",
      );
    }

    const changes: Partial<NewForm> = { updatedAt: new Date() };
    if (patch.title !== undefined) changes.title = cleanTitle(patch.title);
    if (patch.description !== undefined) {
      changes.description = cleanDescription(patch.description);
    }
    if (patch.fields !== undefined) changes.fields = patch.fields;
    if (patch.acceptResponses !== undefined) {
      changes.acceptResponses = patch.acceptResponses;
    }

    const { id } = await context.params;
    const [updated] = await db
      .update(forms)
      .set(changes)
      .where(and(eq(forms.id, id), eq(forms.ownerId, auth.user)))
      .returning();

    if (!updated) return problem(404, "NOT_FOUND", NOT_FOUND);
    return Response.json(formPayload(updated));
  });
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]">,
) {
  return agentRoute("agentDeleteForm", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const removed = await db
      .delete(forms)
      .where(and(eq(forms.id, id), eq(forms.ownerId, auth.user)))
      .returning({ id: forms.id });

    if (removed.length === 0) return problem(404, "NOT_FOUND", NOT_FOUND);
    return new Response(null, { status: 204 });
  });
}
