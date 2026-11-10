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
});

test("shows the April 2026 today line when the screenshot clock is 2026-04-15", async ({
  page,
}) => {
  const beforeX = await readChartScrollXProbe(page);
  expect(beforeX).not.toBeNull();
  await page.evaluate(() => {
    window.__manualScreenshotScrollToToday?.();
  });
  await expect
    .poll(
      async () => {
        const x = await readChartScrollXProbe(page);
        return x != null && beforeX != null && Math.abs(x - beforeX) > 10;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
});
