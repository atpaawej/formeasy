/*
 * Where the site lives, in one place.
 *
 * Social cards and the metadata tags that point at them need absolute URLs, and
 * a crawler has no request context to infer one from. So the address is
 * configuration and never derived from the request: a `Host` header is an
 * instruction, not a check, and obeying it is how a link preview gets pointed at
 * somewhere else. The same reasoning as `AON_AUDIENCE` — see docs/design.md.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL, set by the operator (bare host or a full URL).
 *   2. Vercel's own production / preview hostname, so a deploy is right by
 *      default without anyone copying a value into the dashboard.
 *   3. Nothing — the caller stays quiet and Next's own default stands.
 *
 * `null` rather than a guessed `localhost`: a metadataBase pointed at localhost
 * in production is worse than no metadataBase at all, because it is wrong
 * silently instead of falling back.
 */

export const SITE_NAME = "formeasy";

export const SITE_DESCRIPTION =
  "An open-source form builder. Make a form, share a link, read every answer.";

export const GITHUB_URL = "https://github.com/atpaawej/formeasy";

export const LICENSE = "MIT";

/** The repository's self-hosting reference. */
export const SELF_HOSTING_URL = `${GITHUB_URL}/blob/main/docs/self-hosting.md`;

export function siteUrl(): URL | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(withScheme(explicit));
    } catch {
      // A malformed value is a configuration mistake, not a crash: fall through
      // to the platform hostname rather than taking the page down with it.
    }
  }

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return null;
}

/** `example.com` and `https://example.com` mean the same thing to an operator. */
function withScheme(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
