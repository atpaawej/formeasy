import { auth } from "@clerk/nextjs/server";

import { buildCsv, CSV_MIME, csvFilename } from "@/lib/forms/csv";
import { getOwnedForm, listResponses } from "@/lib/forms/queries";
import { reportError } from "@/lib/observability";

/*
 * GET /api/forms/[id]/export — the CSV download.
 *
 * A Route Handler rather than a Server Action: this is a real GET the browser
 * can follow, and a download that works without JavaScript. It is behind the
 * proxy's auth gate, and it re-checks ownership itself, because a proxy matcher
 * change must never be the only thing protecting someone's data. See AGENTS.md.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/forms/[id]/export">,
) {
  const { id } = await context.params;

  const { userId } = await auth();
  if (!userId) {
    return new Response("Sign in to export this form.", { status: 401 });
  }

  /*
   * The only screen in the app that leaves the browser as a file, so a failure
   * here has no error boundary to fall into: the response *is* the failure page,
   * and it has to be a sentence rather than a driver message. The cause goes to
   * the log.
   */
  try {
    const form = await getOwnedForm(userId, id);
    if (!form) {
      return new Response("That form does not exist.", { status: 404 });
    }

    const responses = await listResponses(form.id);

    // A UTF-8 BOM is what makes Excel read the file as UTF-8 instead of latin-1,
    // which is the difference between "Zoë" and "ZoÃ«".
    const csv = `\uFEFF${buildCsv(form.fields, responses)}`;

    return new Response(csv, {
      headers: {
        "Content-Type": CSV_MIME,
        "Content-Disposition": `attachment; filename="${csvFilename(form.title)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    reportError(error, { where: "exportCsv", formId: id, userId });
    return new Response(
      "Something went wrong building the export. Please try again.",
      { status: 500 },
    );
  }
}
