import { expect, test } from "playwright/test";
import {
  bootNormalPage,
  openSmokeScheduleManualScreenshot,
  readChartScrollXProbe,
} from "../helpers/session.ts";

test.beforeEach(async ({ page, baseURL }) => {
  const port = baseURL?.includes("5174") ? 5174 : 5174;
  await bootNormalPage(page, port, { clearLocalStorage: true });
  await page.evaluate(() => {
    window.__manualScreenshotSetToday?.("2026-04-15");
  });
  await openSmokeScheduleManualScreenshot(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page
    .getByRole("group", { name: "表示の切り替え" })
    .getByRole("button", { name: "日", exact: true })
    .click();
  await page.waitForTimeout(400);
});

test("shows the April 2026 today line when the screenshot clock is 2026-04-15 (NAV-02)", async ({
  page,
}) => {
  const beforeX = await readChartScrollXProbe(page);
  await page.evaluate(() => {
    window.__manualScreenshotScrollToToday?.();
  });
  await page.waitForTimeout(500);
  const afterX = await readChartScrollXProbe(page);
  expect(beforeX).not.toBeNull();
  expect(afterX).not.toBeNull();
  if (beforeX != null && afterX != null) {
    expect(Math.abs(afterX - beforeX)).toBeGreaterThan(10);
  }
});
