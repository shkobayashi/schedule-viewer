import { expect, test } from "playwright/test";
import { bootNormalPage, openSmokeSchedule } from "../helpers/session.ts";

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
});

test("does not install the screenshot clock in the normal browser", async ({ page }) => {
  const hooks = await page.evaluate(() => ({
    setToday: typeof window.__manualScreenshotSetToday,
    scrollToday: typeof window.__manualScreenshotScrollToToday,
    loadSample: typeof window.__manualScreenshotLoadSampleForToday,
  }));
  expect(hooks.setToday).toBe("undefined");
  expect(hooks.scrollToday).toBe("undefined");
  expect(hooks.loadSample).toBe("undefined");
});
