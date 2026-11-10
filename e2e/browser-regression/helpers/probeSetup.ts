import type { Browser } from "playwright/test";
import {
  getKonvaCapability,
  probeKonvaReadable,
  setKonvaCapability,
} from "./konva.ts";
import { bootNormalPage, openSmokeSchedule } from "./session.ts";

export async function ensureKonvaProbed(
  browser: Browser,
  port = 5173,
): Promise<void> {
  if (getKonvaCapability()) return;
  const page = await browser.newPage();
  try {
    await bootNormalPage(page, port, { clearLocalStorage: true });
    await openSmokeSchedule(page);
    await page.locator(".timeline-body").waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(400);
    setKonvaCapability(await probeKonvaReadable(page));
  } finally {
    await page.close();
  }
}
