import { test, expect } from "@playwright/test";

const hasSmokeEnv =
  Boolean(process.env.PLAYWRIGHT_BASE_URL) &&
  Boolean(process.env.E2E_EMAIL) &&
  Boolean(process.env.E2E_PASSWORD);

test.describe("authenticated smoke flow", () => {
  test.skip(!hasSmokeEnv, "Set PLAYWRIGHT_BASE_URL, E2E_EMAIL, and E2E_PASSWORD to run smoke tests.");

  test("can reach the home page shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Huddle")).toBeVisible();
  });
});
