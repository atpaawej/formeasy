import { agentRoute, problem } from "@/lib/agent/http";
import { responsePayload } from "@/lib/agent/payload";
import { requireAgentUser } from "@/lib/agent/session";
import { getOwnedForm, listResponses } from "@/lib/forms/queries";

/*
 * GET /api/agent/forms/{id}/responses
 *
 * The responses list, as JSON. Newest first — the order the screen uses — with an
 * optional `limit`, since an agent reading a form with thousands of answers should
 * not have to pull all of them to see the latest.
 */

const MAX_LIMIT = 500;

export async function GET(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]/responses">,
) {
  return agentRoute("agentListResponses", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const form = await getOwnedForm(auth.user, id);
    if (!form) return problem(404, "NOT_FOUND", "No form with that id.");

    const raw = new URL(request.url).searchParams.get("limit");
    let limit: number | null = null;
    if (raw !== null) {
      limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        return problem(
          400,
          "INVALID_LIMIT",
          `\`limit\` must be an integer from 1 to ${MAX_LIMIT}.`,
        );
      }
    }

    const rows = await listResponses(form.id);

    return Response.json({
      formId: form.id,
      count: rows.length,
      responses: (limit === null ? rows : rows.slice(0, limit)).map((row) =>
        responsePayload(form.fields, row),
      ),
    });
  });
}
