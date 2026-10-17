import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/*
 * The app is behind Clerk, so a crawler has nothing to find in the dashboard or
 * the API — disallowing those keeps the sign-in redirects out of an index. The
 * marketing pages and the public forms are the surface worth crawling, and both
 * are allowed.
 *
 * `/robots.txt` and `/sitemap.xml` are in the proxy matcher's public list: their
 * extensions are not in the matcher's static-file exclusion, so without that
 * entry Clerk would answer them and a crawler would be redirected to sign-in.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: base ? new URL("/sitemap.xml", base).toString() : undefined,
  };
}
