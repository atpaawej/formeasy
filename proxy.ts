import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes bypass the auth gate entirely. Respondents fill forms without an
// account. `/f/*` covers both the form and its thank-you page, and it also covers
// the submit Server Action, which is a POST to /f/[id]. See AGENTS.md: a new
// public route gets added here in the same change that adds the route.
//
// The agent routes are public for the same reason and with the same obligation:
// Clerk cannot authenticate a bearer token, so it must not be the thing that
// answers. Each one re-checks its own AgentOnboard token with `requireAgentUser`,
// and the owner it writes under is the user id that token resolved to. `/auth.md`
// is the discovery file an agent reads before it has a token at all.
const isPublicRoute = createRouteMatcher([
  "/",
  "/about",
  "/agents",
  "/self-hosting",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/f/(.*)",
  "/auth.md",
  "/api/signup",
  "/api/agent/(.*)",
  /*
   * Metadata routes. A shared link is unfurled by a crawler that carries no
   * session, so the cards and the discovery files have to answer without one —
   * and their paths are not in the matcher's static-file exclusion (an
   * `opengraph-image` URL has no extension, `.txt`/`.xml` are not listed), so
   * without an entry here Clerk would answer them and the crawler would be sent
   * to the sign-in page instead of an image.
   */
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
  "/robots.txt",
  "/sitemap.xml",
]);

// Next.js 16 renamed middleware to proxy. Clerk's clerkMiddleware works here.
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
