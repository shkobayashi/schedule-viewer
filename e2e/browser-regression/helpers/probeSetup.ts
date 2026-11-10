import type { Browser } from "playwright/test";
import {
  getKonvaCapability,
  probeKonvaReadable,
  setKonvaCapability,
} from "./konva.ts";
import { bootNormalPage, openSmokeSchedule, waitForFitToWidthSettled } from "./session.ts";

export async function ensureKonvaProbed(
  browser: Browser,
  port = 5173,
): Promise<void> {
  if (getKonvaCapability()) return;
  const page = await browser.newPage();
  try {
    await bootNormalPage(page, port, { clearLocalStorage: true });
    await openSmokeSchedule(page);
    await page.getByRole("button", { name: "全体", exact: true }).click();
    await waitForFitToWidthSettled(page);
    setKonvaCapability(await probeKonvaReadable(page));
  } finally {
    await page.close();
  }
}
