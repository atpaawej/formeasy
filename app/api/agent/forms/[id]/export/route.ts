import { agentRoute, problem } from "@/lib/agent/http";
import { requireAgentUser } from "@/lib/agent/session";
import { buildCsv, CSV_MIME, csvFilename } from "@/lib/forms/csv";
import { getOwnedForm, listResponses } from "@/lib/forms/queries";

/*
 * GET /api/agent/forms/{id}/export
 *
 * The same CSV the dashboard's download button produces, from the same builder —
 * so an agent's export and a person's are the same bytes. Kept separate from the
 * browser route at /api/forms/{id}/export, which stays Clerk-only: one route for
 * a session cookie and one for an agent token means neither has to guess which
 * kind of caller it is looking at.
 */
export async function GET(
  request: Request,
  context: RouteContext<"/api/agent/forms/[id]/export">,
) {
  return agentRoute("agentExportCsv", async () => {
    const auth = await requireAgentUser(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const form = await getOwnedForm(auth.user, id);
    if (!form) return problem(404, "NOT_FOUND", "No form with that id.");

    const responses = await listResponses(form.id);

    // A UTF-8 BOM is what makes Excel read the file as UTF-8 instead of latin-1.
    const csv = `\uFEFF${buildCsv(form.fields, responses)}`;

    return new Response(csv, {
      headers: {
        "Content-Type": CSV_MIME,
        "Content-Disposition": `attachment; filename="${csvFilename(form.title)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
