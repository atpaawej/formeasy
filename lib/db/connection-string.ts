/*
 * Neon hands out `?sslmode=require`. Postgres's own driver (`pg`) treats
 * `prefer`, `require`, and `verify-ca` as aliases for `verify-full` today, and
 * warns about it on every connect — because in `pg` v9 those modes adopt libpq
 * semantics, where `require` stops verifying the certificate chain.
 *
 * The fix the warning itself suggests is to ask for the behaviour we are already
 * getting. Pinning `verify-full` silences it now *and* keeps today's security on
 * the day `pg` upgrades, instead of quietly losing it.
 *
 * String surgery rather than `new URL()`: a connection string carries a
 * password, and parse-then-reserialise can rewrite it. Only the `sslmode` value
 * is touched; everything else is passed through byte for byte.
 *
 * Pure — no `process.env`, no `pg` — so the exact rewrite is pinned by tests.
 */
const LOOSE_SSL_MODES = /([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/gi;

export function withStrictSsl(connectionString: string): string {
  return connectionString.replace(LOOSE_SSL_MODES, "$1verify-full");
}
