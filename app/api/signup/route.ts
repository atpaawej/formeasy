import { agentRoute } from "@/lib/agent/http";
import { signUpAgent } from "@/lib/agent/session";

/*
 * POST /api/signup
 *
 * The only route that may bring an account into being. Everywhere else an unknown
 * identity gets 403 ACCOUNT_REQUIRED; `auth.md` points that error here, and the
 * agent calls this with the same token before retrying its original request.
 *
 * A hit signs in and creates nothing, so a repeat call cannot duplicate an
 * account; `created` tells the two apart. The response carries our user id and
 * whether it was made — never the email, and never the token.
 */
export async function POST(request: Request) {
  return agentRoute("agentSignup", async () => {
    const outcome = await signUpAgent(request);
    if (!outcome.ok) return outcome.response;

    return Response.json(
      { user: outcome.user, created: outcome.created },
      { status: 201 },
    );
  });
}
