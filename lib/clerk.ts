/*
 * Shared configuration for Clerk's hosted components, so the sign-in and
 * sign-up pages cannot drift apart.
 */

// Clerk's hosted UI, themed to formeasy's tokens. See docs/design-system.md.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#2557e8",
    borderRadius: "0.625rem",
  },
};

/**
 * Where a creator lands once Clerk has a session for them.
 *
 * Deliberately a `fallback` and not a `force` target: middleware sends a
 * signed-out visitor to `/sign-in?redirect_url=<the page they wanted>`, and
 * Clerk prefers that `redirect_url` over this value. `force` would throw it
 * away and dump every sign-in on `/dashboard`.
 *
 * The cross-flow variants (`signUpFallbackRedirectUrl` on `<SignIn>` and
 * `signInFallbackRedirectUrl` on `<SignUp>`) matter because both pages link to
 * each other, so a creator can switch flow and still expect to land in the app.
 */
export const AFTER_AUTH_URL = "/dashboard";
