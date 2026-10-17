import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { siteUrl } from "@/lib/site";

/*
 * `siteUrl` reads `process.env` at call time, so it is exercised here without a
 * request or a build — the card routes and the metadata tags all trust it to be
 * absolute, and a relative one is the bug this keeps out.
 */

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("siteUrl", () => {
  it("is null when nothing is configured", () => {
    expect(siteUrl()).toBeNull();
  });

  it("accepts a bare hostname", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "forms.example.com";
    expect(siteUrl()?.toString()).toBe("https://forms.example.com/");
  });

  it("accepts a full URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(siteUrl()?.toString()).toBe("http://localhost:3000/");
  });

  it("prefers the explicit value over the platform hostname", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "forms.example.com";
    process.env.VERCEL_URL = "formeasy-abc123.vercel.app";
    expect(siteUrl()?.host).toBe("forms.example.com");
  });

  it("falls back to the production hostname, then the preview one", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "formeasy.vercel.app";
    process.env.VERCEL_URL = "formeasy-abc123.vercel.app";
    expect(siteUrl()?.toString()).toBe("https://formeasy.vercel.app/");

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(siteUrl()?.toString()).toBe("https://formeasy-abc123.vercel.app/");
  });

  it("ignores a malformed value rather than throwing", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://[not a host";
    expect(siteUrl()).toBeNull();
  });
});
