import { normalizeEmail } from "@agentonboard/sdk";
import { clerkClient } from "@clerk/nextjs/server";

/*
 * Identity, mapped to Clerk.
 *
 * formeasy has no users table: identity is Clerk, and `forms.owner_id` is a
 * Clerk user id. So an agent is not a second kind of principal — it is a way to
 * prove which human is behind the request, and the verified email is the join
 * key. A form an agent creates is one the person can open in the dashboard.
 *
 * Both callbacks receive only `{ email }`, and only after the token verified. The
 * address can therefore only come from the token that was just proved; there is
 * no parameter through which to pass one in. See docs/design.md.
 */

/**
 * The verified email → Clerk user id, or null when there is no account.
 *
 * Clerk's `emailAddress` filter is a case-insensitive **partial** match, so
 * `notada@example.com` comes back for a lookup of `ada@example.com`. Taking the
 * first row would hand an agent somebody else's account, so every returned row
 * is checked for an exact address match and a partial hit resolves to nothing.
 */
export async function resolveClerkAccount({
  email,
}: {
  email: string;
}): Promise<string | null> {
  const normalized = normalizeEmail(email);
  const client = await clerkClient();

  const { data } = await client.users.getUserList({
    emailAddress: [normalized],
  });

  const match = data.find((user) =>
    user.emailAddresses.some(
      (address) => address.emailAddress.toLowerCase() === normalized,
    ),
  );

  return match?.id ?? null;
}

/**
 * The one place an agent can bring an account into being.
 *
 * `skipPasswordRequirement` is what lets the agent get to work immediately: there
 * is no attitude in which it can answer a password prompt, and AgentOnboard has
 * already proved the inbox. The account is otherwise ordinary — the person signs
 * in later through Clerk's own flow, or sets a password.
 */
export async function createClerkAccount({
  email,
}: {
  email: string;
}): Promise<string> {
  const client = await clerkClient();

  const user = await client.users.createUser({
    emailAddress: [normalizeEmail(email)],
    skipPasswordRequirement: true,
  });

  return user.id;
}
