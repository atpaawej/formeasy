import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it does not see .env.local automatically.
try {
  loadEnvFile(".env.local");
} catch {
  // Fine when the environment already provides the variables.
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations use the DIRECT connection, not the pooler.
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
