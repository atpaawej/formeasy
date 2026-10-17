import path from "node:path";

import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

import {
  TEST_USER_EMAIL,
  deleteOwnedForms,
  ensureTestUser,
} from "./support";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(__dirname, "../playwright/.clerk/user.json");

/*
 * Two things have to happen before a single test runs: the test user has to
 * exist, and the account has to be empty — the suite asserts against counts, so
 * a form left by a killed run would be a false failure. Wiping first also means
 * the suite cleans up after a previous run that never reached its teardown.
 */
setup("start from an empty account", async () => {
  await clerkSetup({ dotenv: false });

  const userId = await ensureTestUser();
  await deleteOwnedForms(userId);
});

/*
 * Sign in once, in a real browser, and hand the resulting cookies to every test
 * as `storageState`. Signing in per test would be slower and would exercise
 * Clerk far more than the product.
 */
setup("sign in", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: TEST_USER_EMAIL });

  await page.goto("/dashboard");
  await page.getByRole("heading", { name: "Your forms" }).waitFor();

  await page.context().storageState({ path: authFile });
});
