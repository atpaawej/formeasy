import { describe, expect, it } from "vitest";

import { authMarkdown } from "./auth-md";

/*
 * The discovery file is public and machines read it, so the few things that make
 * it useful are pinned: the audience works in `aon token get`, the signup
 * endpoint is named in the 403 row (the one row that tells an agent how to get
 * an account), and the codes in the table are the codes our routes actually
 * return. See https://agentonboard.xyz/docs/auth-md.
 */

const MARKDOWN = authMarkdown("formeasy.example");

describe("auth.md", () => {
  it("puts the audience where an agent needs it, in both places", () => {
    expect(MARKDOWN).toContain("## Audience");
    expect(MARKDOWN).toContain("`formeasy.example`");
    expect(MARKDOWN).toContain("aon token get formeasy.example");
  });

  it("has the three required sections, in order", () => {
    const audience = MARKDOWN.indexOf("## Audience");
    const endpoints = MARKDOWN.indexOf("## Endpoints");
    const rejected = MARKDOWN.indexOf("## When a request is rejected");

    expect(audience).toBeGreaterThan(-1);
    expect(endpoints).toBeGreaterThan(audience);
    expect(rejected).toBeGreaterThan(endpoints);
  });

  it("lists the signup endpoint and points the 403 row at it", () => {
    expect(MARKDOWN).toContain("POST /api/signup");

    const row = MARKDOWN.split("\n").find((line) =>
      line.startsWith("| 403 "),
    );
    expect(row).toBeDefined();
    expect(row).toContain("/api/signup");
    expect(row).toContain("403");
  });

  it("names the endpoints it actually serves", () => {
    for (const endpoint of [
      "GET /api/agent/forms",
      "POST /api/agent/forms",
      "PATCH /api/agent/forms/{id}",
      "DELETE /api/agent/forms/{id}",
      "POST /api/agent/forms/{id}/publish",
      "POST /api/agent/forms/{id}/unpublish",
      "GET /api/agent/forms/{id}/responses",
      "GET /api/agent/forms/{id}/export",
      "POST /api/signup",
    ]) {
      expect(MARKDOWN, endpoint).toContain(endpoint);
    }
  });

  it("publishes only codes our routes return", () => {
    for (const code of [
      "ACCOUNT_REQUIRED",
      "INVALID_FIELDS",
      "INVALID_BODY",
      "INVALID_LIMIT",
      "INVALID_FORM",
      "NOT_FOUND",
      "RESOLVER_ERROR",
      "CONFIG_ERROR",
      "INTERNAL",
    ]) {
      expect(MARKDOWN, code).toContain(code);
    }
  });

  it("carries no placeholder audience and no secret", () => {
    expect(MARKDOWN).not.toContain("notes.com");
    expect(MARKDOWN).not.toContain("aon_live_");
  });
});
