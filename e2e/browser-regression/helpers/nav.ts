import { expect, type Page } from "playwright/test";
import {
  readChartScrollXProbe,
  readMovableHeaderClientX,
  readSidebarScrollY,
} from "./session.ts";

export async function scrollSidebarToBottom(page: Page): Promise<void> {
  const target = page.locator(".sidebar-row", { hasText: "行40" }).first();
  const sidebar = page.locator(".sidebar");
  const box = await sidebar.boundingBox();
  if (!box) throw new Error("sidebar missing");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let step = 0; step < 40 && !(await target.isVisible().catch(() => false)); step += 1) {
    await page.mouse.wheel(0, 1200);
  }
  await expect(target).toBeVisible({ timeout: 30_000 });
}

export async function wheelShiftHorizontalOnChart(page: Page, deltaY: number): Promise<void> {
  const body = page.locator(".timeline-body");
  const box = await body.boundingBox();
  if (!box) throw new Error("timeline body missing");
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.keyboard.down("Shift");
  await page.mouse.wheel(0, deltaY);
  await page.keyboard.up("Shift");
}

export async function readRowCenterY(page: Page, rowLabel: string): Promise<number | null> {
  const row = page.locator(".sidebar-row", { hasText: rowLabel }).first();
  if (!(await row.isVisible().catch(() => false))) return null;
  const box = await row.boundingBox();
  if (!box) return null;
  return box.y + box.height / 2;
}

export async function dragSidebarResizer(
  page: Page,
  deltaX: number,
): Promise<void> {
  const resizer = page.locator(".sidebar-resizer");
  const box = await resizer.boundingBox();
  if (!box) throw new Error("sidebar resizer missing");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".sidebar-resizer")).toBeVisible();
}

export async function readScrollProbePair(page: Page): Promise<{
  sidebarY: number;
  headerX: number | null;
  chartX: number | null;
}> {
  return {
    sidebarY: await readSidebarScrollY(page),
    headerX: await readMovableHeaderClientX(page),
    chartX: await readChartScrollXProbe(page),
  };
}
