const { test, expect } = require("@playwright/test");

const shouldRun = !!process.env.E2E_BASE_URL;

test.describe("public pages", () => {
  test.skip(!shouldRun, "Set E2E_BASE_URL to run E2E tests");

  test("landing page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI Insurance Adjustor/i);
    await expect(
      page.getByText("How a claim flows through the platform")
    ).toBeVisible();
  });

  test("confirm email page renders", async ({ page }) => {
    await page.goto("/confirm-email");
    await expect(page.getByRole("heading", { name: "Check Your Email" })).toBeVisible();
  });
});
