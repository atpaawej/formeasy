import { agentRoute, problem, readJsonBody } from "@/lib/agent/http";
import { formPayload, formSummaryPayload } from "@/lib/agent/payload";
import { requireAgentUser } from "@/lib/agent/session";
import { db } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { cleanDraft, parseDraftInput } from "@/lib/forms/draft";
import { newFormId } from "@/lib/ids";
import { listForms } from "@/lib/forms/queries";

/*
 * GET  /api/agent/forms — the calling account's forms.
 * POST /api/agent/forms — create one, returning it.
 *
 * The owner is never taken from the request; it is the user id the verified
 * token resolved to, so one agent can never reach another account's forms.
 */

export async function GET(request: Request) {
  return agentRoute("agentListForms", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const rows = await listForms(auth.user);
    return Response.json({ forms: rows.map(formSummaryPayload) });
  });
}

export async function POST(request: Request) {
  return agentRoute("agentCreateForm", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    // No body is a valid create: an empty, untitled draft.
    const input = parseDraftInput((await readJsonBody(request)) ?? {});
    if (!input) {
      return problem(
        400,
        "INVALID_FIELDS",
        "`fields` is not a well-formed field list.",
      );
    }

    const [created] = await db
      .insert(forms)
      .values({ id: newFormId(), ownerId: auth.user, ...cleanDraft(input) })
      .returning();

    return Response.json(formPayload(created), { status: 201 });
  });
}
