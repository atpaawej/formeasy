import { and, eq } from "drizzle-orm";

import { agentRoute, problem } from "@/lib/agent/http";
import { formPayload } from "@/lib/agent/payload";
import { requireAgentUser } from "@/lib/agent/session";
import { db } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { getOwnedForm } from "@/lib/forms/queries";

/*
 * POST /api/agent/forms/{id}/unpublish
 *
 * Back to draft. This is not the same as closing: a draft 404s for respondents, a
 * published-but-closed form stays readable and says it is no longer accepting.
 * Closing is `PATCH { "acceptResponses": false }`.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]/unpublish">,
) {
  return agentRoute("agentUnpublishForm", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const form = await getOwnedForm(auth.user, id);
    if (!form) return problem(404, "NOT_FOUND", "No form with that id.");

    const [draft] = await db
      .update(forms)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(forms.id, id), eq(forms.ownerId, auth.user)))
      .returning();

    return Response.json(formPayload(draft));
  });
}
