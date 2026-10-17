import { describe, expect, it } from "vitest";

import { withStrictSsl } from "@/lib/db/connection-string";

/*
 * `pg` warns on every connect unless `sslmode` is `verify-full`, and in v9 the
 * loose modes stop verifying. These pin the upgrade, and — just as important —
 * pin that nothing else in the string changes.
 */

const NEON =
  "postgresql://user:secret@ep-cool-name-123-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

describe("withStrictSsl", () => {
  it("upgrades every mode pg treats as verify-full", () => {
    expect(withStrictSsl(NEON)).toContain("sslmode=verify-full");
    expect(withStrictSsl("postgres://u:p@h/db?sslmode=prefer")).toBe(
      "postgres://u:p@h/db?sslmode=verify-full",
    );
    expect(withStrictSsl("postgres://u:p@h/db?sslmode=verify-ca")).toBe(
      "postgres://u:p@h/db?sslmode=verify-full",
    );
  });

  it("keeps the other parameters and the credentials untouched", () => {
    expect(
      withStrictSsl(
        "postgresql://user:secret@host/db?sslmode=require&channel_binding=require",
      ),
    ).toBe(
      "postgresql://user:secret@host/db?sslmode=verify-full&channel_binding=require",
    );

    // A middle parameter, to prove the match is not anchored to the start.
    expect(
      withStrictSsl("postgres://u:p@h/db?application_name=formeasy&sslmode=require"),
    ).toBe(
      "postgres://u:p@h/db?application_name=formeasy&sslmode=verify-full",
    );
  });

  it("leaves the deliberate modes alone", () => {
    const verifyFull = "postgres://u:p@h/db?sslmode=verify-full";
    const local = "postgres://u:p@localhost:5432/db";
    const off = "postgres://u:p@h/db?sslmode=disable";
    const noVerify = "postgres://u:p@h/db?sslmode=no-verify";

    expect(withStrictSsl(verifyFull)).toBe(verifyFull);
    expect(withStrictSsl(local)).toBe(local);
    expect(withStrictSsl(off)).toBe(off);
    expect(withStrictSsl(noVerify)).toBe(noVerify);
  });

  it("is idempotent, and ignores a lookalike value", () => {
    const once = withStrictSsl(NEON);
    expect(withStrictSsl(once)).toBe(once);

    // Not an sslmode parameter, so not ours to rewrite.
    const lookalike = "postgres://u:p@h/db?sslmode_hint=require";
    expect(withStrictSsl(lookalike)).toBe(lookalike);
  });
});
