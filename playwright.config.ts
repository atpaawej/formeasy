import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end tests: the whole product in one pass — build a form, publish it,
 * answer it as a stranger, read the response, export it.
 *
 * They need real Clerk keys and a real Postgres, because the point is to test
 * the thing that deploys rather than a mock of it. `pnpm test` stays hermetic;
 * this suite is the one that talks to the outside world. See CONTRIBUTING.md.
 */

// Playwright runs outside Next, so it does not see .env.local on its own. The
// app and the server Playwright starts both inherit what this loads.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Fine when the environment already provides the variables (CI).
}

const PORT = Number(process.env.PORT ?? 3000);
/*
 * `localhost`, not `127.0.0.1`, and it matters. A Clerk *development* instance
 * builds its handshake URLs from the request host, and it says `localhost` —
 * start the suite on `127.0.0.1` and the session cookies land on a host the
 * browser never visits again, so every later navigation bounces to sign-in.
 */
const baseURL = `http://localhost:${PORT}`;

// The signed-in state the suite reuses, written once by the setup project.
const authFile = path.join(__dirname, "playwright/.clerk/user.json");

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  outputDir: "test-results/",
  // One browser at a time: the suite writes to the same database, and a
  // meaningful failure is easier to read than a race.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  webServer: {
    // The production build, not `next dev`: what a self-hoster deploys is what
    // gets tested, down to the CSV route's response headers.
    command: "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: "retry-with-trace",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
  ],
});
