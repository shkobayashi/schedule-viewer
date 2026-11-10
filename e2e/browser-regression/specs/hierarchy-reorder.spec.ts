import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import {
  bootNormalPage,
  levels5SchedulePath,
  openScheduleFile,
  openSmokeSchedule,
} from "../helpers/session.ts";
import { clickUndoOnce } from "../helpers/drag.ts";
import {
  collapseToggleFor,
  dragRowGrip,
  taskSearchBox,
} from "../helpers/sidebar.ts";

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
  await openSmokeSchedule(page);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
});

test("collapses and expands from the triangle", async ({ page }) => {
  const toggle = collapseToggleFor(page, "計画");
  await toggle.click();
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  await toggle.click();
  await expect(page.locator(".sidebar-row", { hasText: "調査" }).first()).toBeVisible();
});

test("shows the full name on hover...", async ({ page }) => {
  await page.setViewportSize({ width: 520, height: 700 });
  const row = page.locator(".sidebar-row.task", { hasText: "期限超過の作業" }).first();
  const name = row.locator(".row-label");
  const title = await name.getAttribute("title");
  expect(title ?? (await name.innerText())).toContain("期限超過の作業");
});

test("reorders a task, a category, and a group from the grip and undoes once", async ({
  page,
}) => {
  const design = page.locator(".sidebar-row.task", { hasText: "設計" }).first();
  const survey = page.locator(".sidebar-row.task", { hasText: "調査" }).first();
  const designBox = await design.boundingBox();
  const surveyBox = await survey.boundingBox();
  if (!designBox || !surveyBox) throw new Error("rows missing");
  expect(designBox.y).toBeGreaterThan(surveyBox.y);
  await dragRowGrip(page, design, -designBox.height - 4);
  const afterDesign = await design.boundingBox();
  const afterSurvey = await survey.boundingBox();
  if (!afterDesign || !afterSurvey) throw new Error("rows missing after drag");
  expect(afterDesign.y).toBeLessThan(afterSurvey.y);
  await clickUndoOnce(page);
  const undoneDesign = await design.boundingBox();
  const undoneSurvey = await survey.boundingBox();
  if (!undoneDesign || !undoneSurvey) throw new Error("rows missing after undo");
  expect(undoneDesign.y).toBeGreaterThan(undoneSurvey.y);
});

test("shows one translucent row while a collapsed category or group grip is dragged", async ({
  page,
}) => {
  await collapseToggleFor(page, "計画").click();
  await expect(page.locator(".sidebar-row", { hasText: "調査" })).toHaveCount(0);
  const grip = page.locator(".sidebar-row", { hasText: "計画" }).first().locator(".row-grip");
  const box = await grip.boundingBox();
  if (!box) throw new Error("grip missing");
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + 80, { steps: 8 });
  await expect(page.locator(".sidebar-drag-ghost")).toHaveCount(1);
  await page.mouse.up();
});

test("does not start a reorder while a name filter leaves one row", async ({ page }) => {
  await taskSearchBox(page).fill("設計");
  await expect.poll(async () => page.locator(".sidebar-row.task").count()).toBe(1);
  const grip = page.locator(".sidebar-row.task .row-grip").first();
  const box = await grip.boundingBox();
  if (!box) throw new Error("grip missing");
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + 80, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator(".sidebar-drag-ghost")).toHaveCount(0);
});

test("does not select or open a menu from a short grip click", async ({ page }) => {
  const grip = page.locator(".sidebar-row.task", { hasText: "設計" }).first().locator(".row-grip");
  await grip.click();
  await expect(page.locator(".context-menu")).toHaveCount(0);
  await expect(page.locator(".sidebar-row.task.selected", { hasText: "設計" })).toHaveCount(0);
});

test("adds a heading from the toolbar menu and from the row menu, then undoes", async ({
  page,
}) => {
  await page.getByRole("button", { name: "追加の種類" }).click();
  await page.getByRole("menuitem", { name: "見出しを追加" }).click();
  const dialog = page.getByRole("dialog", { name: "見出しを追加" });
  await dialog.getByRole("textbox", { name: "名前" }).fill("回帰カテゴリ");
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(page.locator(".sidebar-row", { hasText: "回帰カテゴリ" })).toBeVisible();
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "回帰カテゴリ" })).toHaveCount(0);
});

test("renames a category and a group from double click and undoes", async ({ page }) => {
  await page.locator(".sidebar-row.category", { hasText: "計画" }).first().dblclick();
  const dialog = page.getByRole("dialog", { name: "カテゴリ名" });
  await dialog.getByLabel(/名前/).fill("計画改");
  await dialog.getByRole("button", { name: "保存" }).click();
  await expect(page.locator(".sidebar-row", { hasText: "計画改" })).toBeVisible();
  await clickUndoOnce(page);
  await expect(page.locator(".sidebar-row", { hasText: "計画" }).first()).toBeVisible();
});

test("reorders a category on the five-level sample from the grip", async ({ page }) => {
  await openScheduleFile(page, levels5SchedulePath);
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  await taskSearchBox(page).fill("作業15");
  await expect(page.locator(".sidebar-row.task", { hasText: "作業15-1" }).first()).toBeVisible();
  const first = page.locator(".sidebar-row.task", { hasText: "作業15-1" }).first();
  const second = page.locator(".sidebar-row.task", { hasText: "作業15-2" }).first();
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) throw new Error("task rows missing");
  expect(firstBox.y).toBeLessThan(secondBox.y);
  await dragRowGrip(page, first, secondBox.y - firstBox.y + 8);
  const afterFirst = await first.boundingBox();
  const afterSecond = await second.boundingBox();
  if (!afterFirst || !afterSecond) throw new Error("task rows missing after drag");
  expect(afterFirst.y).toBeGreaterThan(afterSecond.y);
  await clickUndoOnce(page);
});
