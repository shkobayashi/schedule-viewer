import { expect, test } from "playwright/test";
import {
  bootNormalPage,
  openSmokeSchedule,
  readHeaderGridSpacing,
  readMovableHeaderClientX,
  readSidebarScrollY,
  smokeScheduleTitle,
} from "../helpers/session.ts";
import {
  cancelTaskBarDrag,
  clickUndoOnce,
  dragTaskBarByDays,
  readDetailDates,
  releaseTaskBarDrag,
  selectTaskByName,
} from "../helpers/drag.ts";
import { readBarCenterForTask, requireKonva } from "../helpers/konvaUi.ts";

const SMOKE_TASKS = ["調査", "設計", "期限超過の作業", "計画", "前半", "後半"];

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "全体", exact: true }).click();
  await page.waitForTimeout(350);
});

test("shows the smoke fixture title and task names (VIEW-01)", async ({ page }) => {
  await expect(page.locator(".toolbar-title-text")).toContainText(smokeScheduleTitle());
  for (const name of SMOKE_TASKS) {
    await expect(page.locator(".sidebar-row", { hasText: name }).first()).toBeVisible();
  }
});

test("pans the empty chart 80px without moving the list vertically (NAV-01)", async ({
  page,
}) => {
  const body = page.locator(".timeline-body");
  const box = await body.boundingBox();
  if (!box) throw new Error("timeline body missing");
  const scrollYBefore = await readSidebarScrollY(page);
  const headerXBefore = await readMovableHeaderClientX(page);

  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.45;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 80, startY, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const scrollYAfter = await readSidebarScrollY(page);
  const headerXAfter = await readMovableHeaderClientX(page);

  expect(Math.abs(scrollYAfter - scrollYBefore)).toBeLessThan(1);
  expect(headerXBefore).not.toBeNull();
  expect(headerXAfter).not.toBeNull();
  if (headerXBefore != null && headerXAfter != null) {
    const delta = Math.abs(headerXAfter - headerXBefore);
    expect(delta).toBeGreaterThan(8);
    expect(delta).toBeLessThan(120);
  }
});

test("sets day week and month widths to 40 22 and 8 and fits (NAV-02, NAV-03)", async ({
  page,
}) => {
  requireKonva();
  await selectTaskByName(page, "設計");
  const tierGroup = page.getByRole("group", { name: "表示の切り替え" });

  async function barWidthPx(): Promise<number> {
    const bar = await readBarCenterForTask(page, "設計");
    if (!bar) throw new Error("bar missing");
    return bar.width;
  }

  const dates = await readDetailDates(page);
  const dayCount =
    (Date.parse(dates.end) - Date.parse(dates.start)) / (24 * 60 * 60 * 1000) + 1;

  await tierGroup.getByRole("button", { name: "日", exact: true }).click();
  await expect.poll(barWidthPx, { timeout: 5_000 }).toBeCloseTo(dayCount * 40, -1);

  await tierGroup.getByRole("button", { name: "週", exact: true }).click();
  await expect.poll(barWidthPx, { timeout: 5_000 }).toBeCloseTo(dayCount * 22, -1);

  await tierGroup.getByRole("button", { name: "月", exact: true }).click();
  await expect.poll(barWidthPx, { timeout: 5_000 }).toBeCloseTo(dayCount * 8, -1);

  await page.getByRole("button", { name: "全体", exact: true }).click();
  await expect
    .poll(async () => readHeaderGridSpacing(page) ?? (await barWidthPx()) / dayCount, {
      timeout: 5_000,
    })
    .toBeGreaterThan(3);
  const spacing = (await readHeaderGridSpacing(page)) ?? (await barWidthPx()) / dayCount;
  expect(spacing).toBeLessThanOrEqual(90);
});

test("moves 設計 to 2026-04-06 through 2026-04-10 on release and adds one undo (EDIT-02)", async ({
  page,
}) => {
  await dragTaskBarByDays(page, "設計", 2);
  await releaseTaskBarDrag(page);
  const afterDrag = await readDetailDates(page);
  expect(afterDrag.start).toBe("2026-04-06");
  expect(afterDrag.end).toBe("2026-04-10");

  await clickUndoOnce(page);
  const afterUndo = await readDetailDates(page);
  expect(afterUndo.start).toBe("2026-04-04");
  expect(afterUndo.end).toBe("2026-04-08");
});

test("leaves 設計 unchanged when escape is pressed before release (EDIT-02)", async ({
  page,
}) => {
  await selectTaskByName(page, "設計");
  const before = await readDetailDates(page);
  await dragTaskBarByDays(page, "設計", 2);
  await cancelTaskBarDrag(page);
  const after = await readDetailDates(page);
  expect(after).toEqual(before);
});
