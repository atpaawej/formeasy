import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes bypass the auth gate entirely. Respondents fill forms without an
// account. `/f/*` covers both the form and its thank-you page, and it also covers
// the submit Server Action, which is a POST to /f/[id]. See AGENTS.md: a new
// public route gets added here in the same change that adds the route.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/f/(.*)",
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
