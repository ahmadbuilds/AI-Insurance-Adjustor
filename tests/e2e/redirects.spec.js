const { test, expect } = require("@playwright/test");

const shouldRun = !!process.env.E2E_BASE_URL;

test.describe("redirects", () => {
  test.skip(!shouldRun, "Set E2E_BASE_URL to run E2E tests");

  test("signup redirects to login", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/login/);
  });
});
