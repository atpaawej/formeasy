import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

import { withStrictSsl } from "./lib/db/connection-string";

// drizzle-kit runs outside Next, so it does not see .env.local automatically.
try {
  loadEnvFile(".env.local");
} catch {
  // Fine when the environment already provides the variables.
}

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations use the DIRECT connection, not the pooler. A missing value is
    // passed straight through: `generate` never connects, and the commands that
    // do report it themselves.
    // `sslmode=require` is pinned to verify-full so `pg` stops warning about it
    // — the reasoning is in lib/db/connection-string.ts.
    url: databaseUrl ? withStrictSsl(databaseUrl) : databaseUrl!,
  },
});
