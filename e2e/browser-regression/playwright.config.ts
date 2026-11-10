import { defineConfig, devices } from "playwright/test";

const host = "127.0.0.1";

export default defineConfig({
  testDir: "specs",
  snapshotPathTemplate: "{testDir}/../baselines/{arg}{ext}",
  outputDir: "../../test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  globalTimeout: 20 * 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    viewport: { width: 1280, height: 800 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "browser",
      testIgnore: "**/manual-screenshot-only*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://${host}:5173`,
      },
    },
    {
      name: "manual-screenshot-shim",
      testMatch: [
        "**/konva-probe.spec.ts",
        "**/*manual-screenshot-only*.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://${host}:5174`,
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
      url: `http://${host}:5173/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        "npm run dev:manual-screenshot -- --host 127.0.0.1 --port 5174 --strictPort",
      url: `http://${host}:5174/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
