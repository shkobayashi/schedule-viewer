import { test, expect } from "playwright/test";
import {
  bootNormalPage,
  dismissBlockingUi,
  openSmokeSchedule,
  openSmokeScheduleManualScreenshot,
  waitForFitToWidthSettled,
} from "../helpers/session.ts";
import {
  getKonvaCapability,
  probeKonvaReadable,
  setKonvaCapability,
} from "../helpers/konva.ts";

test("probes Konva readability for regression helpers", async ({ page, baseURL }) => {
  const port = baseURL?.includes("5174") ? 5174 : 5173;
  await bootNormalPage(page, port, { clearLocalStorage: true });
  if (port === 5174) {
    await openSmokeScheduleManualScreenshot(page);
  } else {
    await openSmokeSchedule(page);
  }
  await dismissBlockingUi(page);
  if (port === 5173) {
    await page.getByRole("button", { name: "全体", exact: true }).click();
    await waitForFitToWidthSettled(page);
  } else {
    await page.locator(".timeline-body").waitFor({ state: "visible", timeout: 60_000 });
  }

  const result = await probeKonvaReadable(page);
  setKonvaCapability(result);

  expect(getKonvaCapability()).toEqual(result);
  test.info().annotations.push({
    type: "konva-probe",
    description: JSON.stringify(result),
  });
});
