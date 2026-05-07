const { test, expect } = require("@playwright/test");

const shouldRun = !!process.env.E2E_BASE_URL;

const protectedRoutes = [
  "/dashboard",
  "/claims",
  "/claims/track",
  "/profile",
  "/dispute-panel",
  "/admin/manage-claims",
  "/admin/manage-disputes",
  "/admin/create-user",
  "/admin/services/policy",
];

test.describe("guarded pages", () => {
  test.skip(!shouldRun, "Set E2E_BASE_URL to run E2E tests");

  for (const route of protectedRoutes) {
    test(`unauthenticated redirect: ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  }
});
