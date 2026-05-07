const path = require("path");
const { defineConfig } = require("@playwright/test");

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";

module.exports = defineConfig({
  testDir: path.join(__dirname, "e2e"),
  timeout: 30000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
});
