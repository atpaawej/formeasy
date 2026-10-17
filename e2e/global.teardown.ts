import { test as teardown } from "@playwright/test";

import { deleteOwnedForms, findTestUserId } from "./support";

/*
 * Leave nothing behind. Deleting the forms cascades to their responses, so the
 * database is in the state the next run expects even if this one failed.
 *
 * Best effort: a teardown that throws would turn one red test into two, and the
 * next run's setup sweeps whatever this missed.
 */
teardown("delete the test user's forms", async () => {
  const userId = await findTestUserId();
  if (!userId) return;

  try {
    await deleteOwnedForms(userId);
  } catch (error) {
    console.warn("Could not clean up after the run:", error);
  }
});
