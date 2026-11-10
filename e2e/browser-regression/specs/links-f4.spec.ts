import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  cancelTaskBarDrag,
  clickUndoOnce,
  dragTaskBarByDays,
  pointerOnTaskBar,
  selectTaskByName,
} from "../helpers/drag.ts";
import { wheelShiftHorizontalOnChart } from "../helpers/nav.ts";
import {
  countKonvaArrowsInTimelineBody,
  LIGHT_CHART,
  pointerOnConnectionArc,
  pointerOnPredecessorLink,
  pointerOnMilestoneDiamond,
  probeDeleteWithHover,
  readDiamondFillAtPointer,
  readKonvaStrokesInTimelineBody,
  requireKonva,
  strokeMatches,
} from "../helpers/konvaUi.ts";
import { collapseToggleFor } from "../helpers/sidebar.ts";
import {
  bootNormalPage,
  connectionsSchedulePath,
  fullSchedulePath,
  manualColorsSchedulePath,
  openScheduleFile,
  openSmokeSchedule,
  waitForFitToWidthSettled,
  waitForTitle,
} from "../helpers/session.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.describe("smoke schedule links", () => {
  test.beforeEach(async ({ page }) => {
    await bootNormalPage(page, 5173, { clearLocalStorage: true });
    await openSmokeSchedule(page);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "全体", exact: true }).click();
    await waitForFitToWidthSettled(page);
  });

  test("deletes the hovered predecessor with Delete and restores it with undo", async ({
    page,
  }) => {
    requireKonva();
    const detail = page.getByRole("complementary", { name: "タスクの詳細" });
    const predecessorField = detail
      .locator(".field")
      .filter({ has: page.getByLabel("先行タスク") });
    const arrowsBefore = await countKonvaArrowsInTimelineBody(page);
    expect(arrowsBefore).toBeGreaterThanOrEqual(1);
    await selectTaskByName(page, "設計");
    await expect(predecessorField.getByText("調査")).toBeVisible();
    const linkPt = await pointerOnPredecessorLink(page, "調査", "設計");
    const chosaBar = await pointerOnTaskBar(page, "調査");
    const sekkeiBar = await pointerOnTaskBar(page, "設計");
    expect(Math.hypot(linkPt.x - chosaBar.x, linkPt.y - chosaBar.y)).toBeGreaterThan(18);
    expect(Math.hypot(linkPt.x - sekkeiBar.x, linkPt.y - sekkeiBar.y)).toBeGreaterThan(18);
    await page.locator(".timeline-body").click({ position: { x: 10, y: 10 } });
    await probeDeleteWithHover(
      page,
      (stroke) =>
        stroke.className === "Arrow" && strokeMatches(stroke.stroke, LIGHT_CHART.linkOk),
    );
    await expect
      .poll(async () => countKonvaArrowsInTimelineBody(page))
      .toBe(arrowsBefore - 1);
    await expect(page.locator(".sidebar-row.task", { hasText: "調査" })).toBeVisible();
    await expect(page.locator(".sidebar-row.task", { hasText: "設計" })).toBeVisible();
    await selectTaskByName(page, "設計");
    await expect(predecessorField.getByText("なし")).toBeVisible();
    await clickUndoOnce(page);
    await expect
      .poll(async () => countKonvaArrowsInTimelineBody(page))
      .toBe(arrowsBefore);
    await selectTaskByName(page, "設計");
    await expect(predecessorField.getByText("調査")).toBeVisible();
  });

  test("cancels a link drag onto an earlier task with Escape", async ({ page }) => {
    requireKonva();
    await selectTaskByName(page, "設計");
    await page.getByRole("button", { name: /^線を引く/ }).click();
    const target = await pointerOnTaskBar(page, "期限超過の作業");
    const arrowsBefore = await countKonvaArrowsInTimelineBody(page);
    await page.mouse.move(target.x, target.y);
    await page.mouse.down();
    await page.mouse.move(target.x + 40, target.y, { steps: 6 });
    const preview = await readKonvaStrokesInTimelineBody(page);
    const previewArrow = preview.find((stroke) => stroke.className === "Arrow");
    expect(previewArrow).toBeDefined();
    if (previewArrow) {
      expect(strokeMatches(previewArrow.stroke, LIGHT_CHART.linkOk)).toBe(true);
      expect(previewArrow.strokeWidth).toBeCloseTo(1.25, 2);
    }
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect.poll(async () => countKonvaArrowsInTimelineBody(page)).toBe(arrowsBefore);
    await selectTaskByName(page, "設計");
    await expect(
      page.getByRole("complementary", { name: "タスクの詳細" }),
    ).toContainText("調査");
  });

  test("shows a filled approval diamond and a hollow tentative diamond", async ({ page }) => {
    requireKonva();
    await openScheduleFile(page, manualColorsSchedulePath);
    await page.getByRole("button", { name: "全体", exact: true }).click();
    await page
      .getByRole("group", { name: "表示の切り替え" })
      .getByRole("button", { name: "月", exact: true })
      .click();
  const committedPt = await pointerOnMilestoneDiamond(page, "締切（確定）");
    const tentativePt = await pointerOnMilestoneDiamond(page, "次の節目（未確定）");
    if (!committedPt || !tentativePt) throw new Error("milestone diamond pointer missing");
    const committed = await readDiamondFillAtPointer(page, committedPt.x, committedPt.y);
    const tentative = await readDiamondFillAtPointer(page, tentativePt.x, tentativePt.y);
    expect(committed.fill).not.toBeNull();
    expect(tentative.fill).toBeNull();
    expect(committed.stroke.length).toBeGreaterThan(0);
    expect(tentative.stroke.length).toBeGreaterThan(0);
  });
});

test.describe("full and color schedules", () => {
  test.beforeEach(async ({ page }) => {
    await bootNormalPage(page, 5173, { clearLocalStorage: true });
  });

  test("deletes the hovered connection arc with Delete and restores the label with undo", async ({
    page,
  }) => {
    requireKonva();
    await openScheduleFile(page, connectionsSchedulePath);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "全体", exact: true }).click();
    const strokesBefore = (await readKonvaStrokesInTimelineBody(page)).filter(
      (stroke) => strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc),
    ).length;
    expect(strokesBefore).toBeGreaterThan(0);
    await page.locator(".timeline-body").click({ position: { x: 12, y: 12 } });
    await probeDeleteWithHover(
      page,
      (stroke) =>
        stroke.className === "Line" && strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc),
    );
    await expect
      .poll(async () => {
        const strokes = (await readKonvaStrokesInTimelineBody(page)).filter((stroke) =>
          strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc),
        );
        return strokes.length;
      })
      .toBeLessThan(strokesBefore);
    await clickUndoOnce(page);
    await expect
      .poll(async () => {
        const strokes = (await readKonvaStrokesInTimelineBody(page)).filter((stroke) =>
          strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc),
        );
        return strokes.length;
      })
      .toBe(strokesBefore);
  });

  test("drops only the arc of a deleted endpoint and keeps the other label in the file", async ({
    page,
  }) => {
    requireKonva();
    await openScheduleFile(page, fullSchedulePath);
    await waitForTitle(page, "回帰の詳細");
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await selectTaskByName(page, "調査");
    await page.getByRole("button", { name: "削除", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "削除" }).click();
    await expect(page.getByText("相談")).toHaveCount(0);
    await page.getByRole("button", { name: "メニュー" }).click();
    const saveItem = page
      .getByRole("menuitem")
      .filter({ hasText: /^保存/ })
      .and(page.locator(":not([disabled])"))
      .first();
    const [download] = await Promise.all([page.waitForEvent("download"), saveItem.click()]);
    const savedPath = path.join(os.tmpdir(), `regression-view-15c-${Date.now()}.schedule.json`);
    await download.saveAs(savedPath);
    const savedDoc = JSON.parse(fs.readFileSync(savedPath, "utf8")) as {
      connections?: { label: string }[];
    };
    expect((savedDoc.connections ?? []).some((c) => c.label === "相談")).toBe(false);
    await openScheduleFile(page, savedPath);
    await waitForTitle(page, "回帰の詳細");
    await expect(page.getByText("相談")).toHaveCount(0);
    fs.unlinkSync(savedPath);
  });
});

test.describe("manual colors and connections", () => {
  test.beforeEach(async ({ page }) => {
    await bootNormalPage(page, 5173, { clearLocalStorage: true });
  });

  test("marks only broken predecessor links red and removes the arrow when collapsed", async ({
    page,
  }) => {
    requireKonva();
    await openScheduleFile(page, manualColorsSchedulePath);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "全体", exact: true }).click();
    const strokes = await readKonvaStrokesInTimelineBody(page);
    const arrows = strokes.filter((stroke) => stroke.className === "Arrow");
    const broken = arrows.filter((stroke) =>
      strokeMatches(stroke.stroke, LIGHT_CHART.linkBroken),
    );
    const ok = arrows.filter((stroke) => strokeMatches(stroke.stroke, LIGHT_CHART.linkOk));
    expect(broken.length).toBeGreaterThanOrEqual(1);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    const arrowsBefore = arrows.length;
    await collapseToggleFor(page, "色と線").click();
    await expect.poll(async () => countKonvaArrowsInTimelineBody(page)).toBeLessThan(
      arrowsBefore,
    );
  });

  test("reddens the predecessor while the end is dragged past the successor, before release", async ({
    page,
  }) => {
    requireKonva();
    await openScheduleFile(page, manualColorsSchedulePath);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("group", { name: "表示の切り替え" }).getByRole("button", { name: "週", exact: true }).click();
    await dragTaskBarByDays(page, "完了（緑）", 12);
    const strokes = await readKonvaStrokesInTimelineBody(page);
    const arrow = strokes.find((stroke) => stroke.className === "Arrow");
    expect(arrow).toBeDefined();
    if (arrow) {
      expect(strokeMatches(arrow.stroke, LIGHT_CHART.linkBroken)).toBe(true);
      expect(arrow.strokeWidth).toBeGreaterThanOrEqual(1.75);
    }
    await cancelTaskBarDrag(page);
  });

  test("keeps the arrow head outside the successor bar in week and month", async ({ page }) => {
    requireKonva();
    await openScheduleFile(page, connectionsSchedulePath);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "全体", exact: true }).click();
    for (const tier of ["週", "月"] as const) {
      await page.getByRole("group", { name: "表示の切り替え" }).getByRole("button", { name: tier, exact: true }).click();
      const link = await pointerOnPredecessorLink(page, "上：先行側", "下：後続側");
      const bar = await pointerOnTaskBar(page, "下：後続側");
      expect(link.x).toBeLessThanOrEqual(bar.x);
    }
  });

  test("draws connection arcs without arrowheads and with a different stroke from predecessor links", async ({
    page,
  }) => {
    requireKonva();
    await openScheduleFile(page, connectionsSchedulePath);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "全体", exact: true }).click();
    const strokes = await readKonvaStrokesInTimelineBody(page);
    const arcs = strokes.filter((stroke) =>
      strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc),
    );
    const preds = strokes.filter((stroke) => stroke.className === "Arrow");
    expect(arcs.length).toBeGreaterThan(0);
    expect(preds.length).toBeGreaterThan(0);
    expect(preds.every((stroke) => !strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc))).toBe(
      true,
    );
  });

  test("keeps arcs on broken-only lineage and leaves connection-only rows hidden", async ({
    page,
  }) => {
    await openScheduleFile(page, connectionsSchedulePath);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await page.getByRole("button", { name: /^絞り込み/ }).click();
    await page.locator(".filter-panel").getByLabel("前後", { exact: true }).selectOption("broken");
    await page.keyboard.press("Escape");
    await expect(page.locator(".sidebar-row.task", { hasText: "左上：短い棒" })).toHaveCount(0);
    await expect(page.locator(".sidebar-row.task", { hasText: "右下：後の棒" })).toHaveCount(0);
    await expect(page.locator(".sidebar-row.task", { hasText: "下：後続側" })).toBeVisible();
    requireKonva();
    const strokes = await readKonvaStrokesInTimelineBody(page);
    expect(
      strokes.some((stroke) => strokeMatches(stroke.stroke, LIGHT_CHART.connectionArc)),
    ).toBe(true);
  });
});
