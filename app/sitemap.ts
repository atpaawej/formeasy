import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/*
 * The pages worth indexing. Public form links are deliberately absent: there is
 * no query for "every published form", and enumerating them would put strangers'
 * forms in a search index. Empty when no site URL is configured — a sitemap of
 * relative URLs would be invalid, and a wrong host is worse than none.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];

  const lastModified = new Date();

  return [
    { url: new URL("/", base).toString(), lastModified, priority: 1 },
    {
      url: new URL("/self-hosting", base).toString(),
      lastModified,
      priority: 0.6,
    },
    { url: new URL("/about", base).toString(), lastModified, priority: 0.5 },
  ];
}
