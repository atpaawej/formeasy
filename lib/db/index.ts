import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { withStrictSsl } from "./connection-string";
import * as schema from "./schema";

// The pooled connection string. The direct one is only for migrations.
const connectionString = process.env.DATABASE_URL_POOLED;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_POOLED is not set. Copy .env.example to .env.local and fill it in.",
  );
}

// Reuse the pool across hot reloads in development so we don't leak connections.
const globalForDb = globalThis as unknown as { __formeasyPool?: Pool };

const pool =
  globalForDb.__formeasyPool ??
  new Pool({
    // Neon URLs say `sslmode=require`; `pg` warns on it, and v9 would weaken it.
    // See connection-string.ts.
    connectionString: withStrictSsl(connectionString),
    max: 10,
    // Without a connect timeout a stalled route to the database blocks the
    // request indefinitely instead of failing where we can see it.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
if (process.env.NODE_ENV !== "production") {
  globalForDb.__formeasyPool = pool;
}

export const db = drizzle(pool, { schema });
