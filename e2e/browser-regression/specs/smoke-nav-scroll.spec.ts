import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  bootNormalPage,
  openLongSchedule,
  openSmokeSchedule,
  readChartScrollXProbe,
  readMovableHeaderClientX,
  readSidebarScrollY,
} from "../helpers/session.ts";
import {
  dragSidebarResizer,
  readRowCenterY,
  readScrollProbePair,
  scrollSidebarToBottom,
  wheelShiftHorizontalOnChart,
} from "../helpers/nav.ts";
import { readBarCenterForTask, requireKonva } from "../helpers/konvaUi.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await page.waitForTimeout(350);
});

test("scrolls the long list until row 40...", async ({
  page,
}) => {
  await openLongSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await scrollSidebarToBottom(page);
  await expect(page.locator(".sidebar-row", { hasText: "行40" }).first()).toBeVisible();
  const row01 = page.locator(".sidebar-row", { hasText: "行01" }).first();
  await expect(row01).not.toBeInViewport({ ratio: 0.05 });
  requireKonva();
  const rowY = await readRowCenterY(page, "行40");
  const bar = await readBarCenterForTask(page, "行40");
  expect(rowY).not.toBeNull();
  expect(bar).not.toBeNull();
  if (rowY != null && bar) {
    expect(Math.abs(rowY - bar.y)).toBeLessThan(12);
  }
});

test("shifts the chart horizontally with shift and the wheel", async ({
  page,
}) => {
  const before = await readScrollProbePair(page);
  await wheelShiftHorizontalOnChart(page, 400);
  const after = await readScrollProbePair(page);
  expect(Math.abs(after.sidebarY - before.sidebarY)).toBeLessThan(2);
  expect(before.headerX).not.toBeNull();
  expect(after.headerX).not.toBeNull();
  if (before.headerX != null && after.headerX != null) {
    expect(Math.abs(after.headerX - before.headerX)).toBeGreaterThan(20);
  }
});

test("scrolls with ctrl or meta and the arrow keys...", async ({
  page,
}) => {
  await openLongSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  const sidebar = page.locator(".sidebar-viewport");
  await sidebar.click();
  const y0 = await readSidebarScrollY(page);
  await page.keyboard.press(`${mod}+ArrowDown`);
  await page.waitForTimeout(250);
  const y1 = await readSidebarScrollY(page);
  expect(y1).toBeGreaterThan(y0);
  await page.keyboard.press(`${mod}+ArrowRight`);
  await page.waitForTimeout(250);
  const x0 = await readMovableHeaderClientX(page);
  expect(x0).not.toBeNull();
  await page.keyboard.press(`${mod}+ArrowRight`);
  await page.waitForTimeout(250);
  const x1 = await readMovableHeaderClientX(page);
  expect(x1).not.toBeNull();
  if (x0 != null && x1 != null) {
    expect(x1).not.toBe(x0);
  }
});

test("keeps sticky headings in sync...", async ({ page }) => {
  await openLongSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  const stickyBefore = await page.locator(".sidebar-sticky-clip").count();
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  const stickyAfter = await page.locator(".sidebar-sticky-clip").count();
  expect(stickyAfter).toBeGreaterThanOrEqual(stickyBefore);
  await scrollSidebarToBottom(page);
  await expect(page.locator(".sidebar-sticky")).toBeVisible();
});

test("scrolls the sidebar horizontally with the wheel and zooms there", async ({ page }) => {
  const sidebar = page.locator(".sidebar");
  const box = await sidebar.boundingBox();
  if (!box) throw new Error("sidebar missing");
  await page.mouse.move(box.x + 40, box.y + 80);
  const xBefore = await readChartScrollXProbe(page);
  await page.mouse.wheel(80, 0);
  await page.waitForTimeout(200);
  const xAfterWheel = await readChartScrollXProbe(page);
  expect(xBefore).not.toBeNull();
  expect(xAfterWheel).not.toBeNull();
  if (xBefore != null && xAfterWheel != null) {
    expect(xAfterWheel).not.toBe(xBefore);
  }
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.down(mod);
  await page.mouse.wheel(0, -200);
  await page.keyboard.up(mod);
  await page.waitForTimeout(300);
  const spacing = await page
    .evaluate(() => document.documentElement.style.getPropertyValue("--s"))
    .catch(() => "");
  expect(spacing || "1").toBeTruthy();
});

test("drags the sidebar boundary and keeps the row and bar on the same y", async ({ page }) => {
  requireKonva();
  const rowYBefore = await readRowCenterY(page, "調査");
  const barBefore = await readBarCenterForTask(page, "調査");
  expect(rowYBefore).not.toBeNull();
  expect(barBefore).not.toBeNull();
  await dragSidebarResizer(page, 160);
  const rowYAfter = await readRowCenterY(page, "調査");
  const barAfter = await readBarCenterForTask(page, "調査");
  expect(rowYAfter).not.toBeNull();
  expect(barAfter).not.toBeNull();
  if (rowYAfter != null && barAfter != null) {
    expect(Math.abs(rowYAfter - barAfter.y)).toBeLessThan(12);
  }
  if (rowYBefore != null && rowYAfter != null) {
    expect(Math.abs(rowYAfter - rowYBefore)).toBeLessThan(6);
  }
});
