import { and, eq } from "drizzle-orm";

import { agentRoute, problem } from "@/lib/agent/http";
import { formPayload } from "@/lib/agent/payload";
import { requireAgentUser } from "@/lib/agent/session";
import { db } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { validateFormForPublish } from "@/lib/fields";
import { getOwnedForm } from "@/lib/forms/queries";

/*
 * POST /api/agent/forms/{id}/publish
 *
 * Publishing is the one write that validates, so it is its own endpoint rather
 * than a `status` field on PATCH — the same rule the builder follows. Validation
 * runs over the *stored* fields, via the same `validateFormForPublish` the
 * Server Action uses, so an agent cannot publish a form the builder would refuse.
 * The problems come back in the body so the agent can fix them and try again.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]/publish">,
) {
  return agentRoute("agentPublishForm", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const form = await getOwnedForm(auth.user, id);
    if (!form) return problem(404, "NOT_FOUND", "No form with that id.");

    const problems = validateFormForPublish(form.fields);
    if (problems.length > 0) {
      return Response.json(
        {
          code: "INVALID_FORM",
          error: "The form is not ready to publish.",
          problems,
        },
        { status: 400 },
      );
    }

    const [published] = await db
      .update(forms)
      .set({ status: "published", updatedAt: new Date() })
      .where(and(eq(forms.id, id), eq(forms.ownerId, auth.user)))
      .returning();

    return Response.json(formPayload(published));
  });
}
