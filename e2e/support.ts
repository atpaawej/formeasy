import { Pool } from "pg";
import { createClerkClient } from "@clerk/backend";

import { withStrictSsl } from "../lib/db/connection-string";

/*
 * The suite's fixtures: the Clerk user the tests act as, and the rows that user
 * owns. Both the setup and the teardown project use this, so the residue a run
 * leaves behind is defined in exactly one place — and runs that die halfway
 * still get swept by the next one.
 *
 * The email is a Clerk *test* address (`+clerk_test`), so no real email is ever
 * sent and its verification codes are fixed. See docs/self-hosting.md.
 */

export const TEST_USER_EMAIL =
  process.env.E2E_CLERK_USER_EMAIL?.trim() || "e2e+clerk_test@example.com";

const TEST_USER_PASSWORD =
  process.env.E2E_CLERK_USER_PASSWORD || "formeasy-e2e-password";

function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is not set. The end-to-end suite needs a real Clerk dev instance — see CONTRIBUTING.md.",
    );
  }
  return createClerkClient({ secretKey });
}

/** The test user's id, or null when it does not exist yet. */
export async function findTestUserId(): Promise<string | null> {
  const { data } = await clerk().users.getUserList({
    emailAddress: [TEST_USER_EMAIL],
  });
  return data[0]?.id ?? null;
}

/**
 * Make sure the test user exists, and return its id. Creating it once and
 * reusing it keeps repeated runs fast; the password is only there so the
 * account can also be signed into by hand while debugging.
 */
export async function ensureTestUser(): Promise<string> {
  const existing = await findTestUserId();
  if (existing) return existing;

  const user = await clerk().users.createUser({
    emailAddress: [TEST_USER_EMAIL],
    password: TEST_USER_PASSWORD,
    firstName: "E2E",
    lastName: "Runner",
  });
  return user.id;
}

/** Every form this user owns — and, by cascade, every response to one. */
export async function deleteOwnedForms(ownerId: string): Promise<void> {
  const connectionString = process.env.DATABASE_URL_POOLED;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_POOLED is not set. The end-to-end suite writes real rows and cleans them up — see CONTRIBUTING.md.",
    );
  }

  const pool = new Pool({ connectionString: withStrictSsl(connectionString), max: 1 });
  try {
    await pool.query("delete from forms where owner_id = $1", [ownerId]);
  } finally {
    await pool.end();
  }
}
