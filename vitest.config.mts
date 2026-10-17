import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The database integration tests need the real connection string. `pnpm test`
// stays hermetic and fast; `pnpm test:db` opts in.
if (process.env.RUN_DB_TESTS === "1") {
  try {
    loadEnvFile(".env.local");
  } catch {
    // Fine when the environment already provides the variables.
  }
}

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" -> repo root so tests import the same specifiers
    // the app does.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "drizzle/**"],
  },
});
