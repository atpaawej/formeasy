import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

/*
 * The v1 loop, in one pass: build a form, publish it, answer it the way a
 * stranger does, read the response back, export it.
 *
 * Two things make this worth the round trip that the unit tests cannot cover.
 * It runs against a **production build**, so what is being tested is the
 * artifact a self-hoster deploys; and it answers the form in a **separate,
 * signed-out browser context**, because "respondents need no account" is a
 * promise a proxy matcher can quietly break while the owner — who is signed in
 * — never notices.
 *
 * It writes real rows to whatever database it is pointed at, so the setup and
 * teardown projects sweep the test user's forms. See e2e/support.ts.
 */

const TITLE = "Team offsite feedback";
const QUESTION = "What was the best part of the offsite?";
const ANSWER = "The hike on the second morning";

test("build → publish → fill → submit → export", async ({ page, browser }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New form" }).click();

  await expect(page).toHaveURL(/\/dashboard\/forms\/[\w-]+\/edit/);
  const formId = new URL(page.url()).pathname.split("/")[3]!;

  // --- build ---------------------------------------------------------------
  await page.getByLabel("Form title").fill(TITLE);
  await page.getByRole("button", { name: "Short text" }).click();
  await page.getByLabel("Question label").fill(QUESTION);

  // Publish writes the whole document, so there is no autosave to wait for
  // between the two: publishing is the save.
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

  // --- answer it, signed out ----------------------------------------------
  const { origin } = new URL(page.url());
  const respondent = await browser.newContext();
  const anonymous = await respondent.newPage();

  await anonymous.goto(`${origin}/f/${formId}`);
  await expect(anonymous.getByText(QUESTION)).toBeVisible();

  await anonymous.getByPlaceholder("Type your answer").fill(ANSWER);
  await anonymous.getByRole("button", { name: "Submit" }).click();

  await expect(anonymous).toHaveURL(`${origin}/f/${formId}/submitted`);
  await expect(anonymous.getByText("You can close this tab.")).toBeVisible();
  await respondent.close();

  // --- read it back --------------------------------------------------------
  await page.goto(`/dashboard/forms/${formId}`);
  await expect(page.getByText(ANSWER)).toBeVisible();

  // --- export it -----------------------------------------------------------
  const downloadStarted = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloadStarted;

  expect(download.suggestedFilename()).toBe("team-offsite-feedback.csv");

  const path = await download.path();
  // The BOM is what makes Excel read it as UTF-8, so it is dropped here and
  // asserted separately rather than silently tolerated.
  const csv = await readFile(path!, "utf8");
  expect(csv.startsWith("\uFEFF")).toBe(true);

  const [header, ...rows] = csv.slice(1).trimEnd().split("\r\n");
  expect(header).toBe(`Submitted at,${QUESTION}`);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toContain(ANSWER);
});
