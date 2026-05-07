const { test, expect } = require("@playwright/test");

const shouldRun = !!process.env.E2E_BASE_URL;

test.describe("login", () => {
  test.skip(!shouldRun, "Set E2E_BASE_URL to run E2E tests");

  test("login form renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
