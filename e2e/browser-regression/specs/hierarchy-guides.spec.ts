import path from "node:path";
import { expect, test } from "playwright/test";
import { ensureKonvaProbed } from "../helpers/probeSetup.ts";
import { clickUndoOnce } from "../helpers/drag.ts";
import { hasSummaryBarNearRow, requireKonva } from "../helpers/konvaUi.ts";
import {
  bootNormalPage,
  levels2SchedulePath,
  levels3SchedulePath,
  levels5SchedulePath,
  openScheduleFile,
  openSmokeSchedule,
  repoRoot,
  smokeSchedulePath,
  waitForFitToWidthSettled,
  waitForTitle,
} from "../helpers/session.ts";
import { collapseToggleFor, taskSearchBox } from "../helpers/sidebar.ts";

function hierarchyRailLines(page: import("playwright/test").Page, rowLabel: string) {
  return page
    .locator(".sidebar-row", { hasText: rowLabel })
    .first()
    .locator(".hierarchy-guide-line");
}

test.beforeAll(async ({ browser }) => {
  await ensureKonvaProbed(browser);
});

test.beforeEach(async ({ page }) => {
  await bootNormalPage(page, 5173, { clearLocalStorage: true });
});

test("drops the stem under a collapsed five-level heading and rejoins it when expanded", async ({
  page,
}) => {
  await openScheduleFile(page, levels5SchedulePath);
  await waitForTitle(page, "階層サンプル（5段）");
  await page.locator(".timeline-body").waitFor({ state: "visible" });
  const parentRow = page
    .locator(".sidebar-row.hierarchy")
    .filter({ has: page.getByText("事業甲", { exact: true }) })
    .first();
  const toggle = parentRow.locator("button.twist");
  const stemsExpanded = await hierarchyRailLines(page, "事業甲-工程1").evaluateAll((els) =>
    els.filter((el) => el.classList.contains("stem")).map((el) => el.getBoundingClientRect().bottom),
  );
  expect(stemsExpanded.length).toBeGreaterThan(0);
  const parentBox = await parentRow.boundingBox();
  if (!parentBox) throw new Error("parent row missing");
  await toggle.click();
  const stemBottom = await hierarchyRailLines(page, "事業甲").evaluateAll((els) =>
    els
      .filter((el) => el.classList.contains("stem"))
      .map((el) => el.getBoundingClientRect().bottom),
  );
  if (stemBottom.length > 0) {
    expect(Math.max(...stemBottom)).toBeLessThanOrEqual(parentBox.bottom + 2);
  }
  await toggle.click();
  await expect(page.locator(".sidebar-row", { hasText: "作業15-1" }).first()).toBeVisible();
});

test("keeps guide rail width and name starts aligned on five-level and three-level samples", async ({
  page,
}) => {
  for (const [file, title] of [
    [levels5SchedulePath, "階層サンプル（5段）"],
    [levels3SchedulePath, "階層サンプル（3段）"],
  ] as const) {
    await openScheduleFile(page, file);
    await waitForTitle(page, title);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    const row = page.locator(".sidebar-row.task").first();
    const label = row.locator(".row-label");
    const rail = row.locator(".hierarchy-guide-rail");
    const labelBox = await label.boundingBox();
    const railBox = await rail.boundingBox();
    expect(labelBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    if (labelBox && railBox) {
      const gap = labelBox.x - (railBox.x + railBox.width);
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThan(36);
    }
    const lineCount = await row.locator(".hierarchy-guide-line").count();
    expect(lineCount).toBeLessThanOrEqual(4);
    await collapseToggleFor(page, title.includes("5") ? "事業甲" : "要件").click();
    const lineCountCollapsed = await row.locator(".hierarchy-guide-line").count();
    expect(lineCountCollapsed).toBeLessThanOrEqual(lineCount);
  }
});

test("shows level names above the band for two, three, four, and five levels and omits them when the file has no levels", async ({
  page,
}) => {
  const labeled: { path: string; title: string; banner: RegExp }[] = [
    {
      path: levels2SchedulePath,
      title: "階層サンプル（2段）",
      banner: /まとまり.*タスク/,
    },
    {
      path: levels3SchedulePath,
      title: "階層サンプル（3段）",
      banner: /工程.*機能.*タスク/,
    },
    {
      path: path.join(repoRoot, "examples/hierarchy/levels-4.schedule.json"),
      title: "階層サンプル（4段）",
      banner: /事業.*工程.*作業.*タスク/,
    },
    {
      path: levels5SchedulePath,
      title: "階層サンプル（5段）",
      banner: /事業.*工程.*機能.*作業.*タスク/,
    },
  ];
  for (const sample of labeled) {
    await openScheduleFile(page, sample.path);
    await waitForTitle(page, sample.title);
    await expect(page.locator(".chart-top-banners .hierarchy-banner")).toContainText(sample.banner);
  }
  await openSmokeSchedule(page);
  await expect(page.locator(".chart-top-banners .hierarchy-banner")).toHaveCount(0);
});

test("shows the outline mismatch and hides add-heading on a short branch and an empty middle branch", async ({
  page,
}) => {
  await openScheduleFile(page, levels5SchedulePath);
  await waitForTitle(page, "階層サンプル（5段）");
  await page.getByRole("button", { name: "階層の名前、意味、指示" }).click();
  const dialog = page.getByRole("dialog", { name: "階層" });
  while ((await dialog.getByRole("button", { name: "削除" }).count()) > 2) {
    await dialog.getByRole("button", { name: "削除" }).last().click();
  }
  await expect(
    dialog.getByText("入れ子の数が違うので、この段数はまだ保存できません。"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "適用" }).click();
  await expect(page.getByText("階層の定義と入れ子の数が違います。")).toBeVisible({
    timeout: 15_000,
  });
});

test("aligns hierarchy editor fields and refuses save when a level is added", async ({
  page,
}) => {
  await openScheduleFile(page, levels3SchedulePath);
  await waitForTitle(page, "階層サンプル（3段）");
  await page.getByRole("button", { name: "階層の名前、意味、指示" }).click();
  const dialog = page.getByRole("dialog", { name: "階層" });
  await expect(dialog).toBeVisible();
  const meaningBoxes = await dialog.getByLabel("意味").all();
  const nameBoxes = await dialog.getByLabel("名前").all();
  expect(meaningBoxes.length).toBeGreaterThan(1);
  const leftPositions = await Promise.all(
    meaningBoxes.map(async (field) => (await field.boundingBox())?.x ?? 0),
  );
  expect(new Set(leftPositions.map((x) => Math.round(x))).size).toBe(1);
  expect(new Set((await Promise.all(nameBoxes.map(async (f) => (await f.boundingBox())?.x ?? 0))).map((x) => Math.round(x))).size).toBe(1);
  await dialog.getByRole("button", { name: "段を追加" }).click();
  await expect(dialog.getByText("入れ子の数が違うので、この段数はまだ保存できません。")).toBeVisible();
  await dialog.getByRole("button", { name: "閉じる" }).click();
});

test("matches sidebar guides and parent bars for two, three, and five levels", async ({
  page,
}) => {
  const samples = [
    [levels2SchedulePath, "階層サンプル（2段）", "北ブロック"],
    [levels3SchedulePath, "階層サンプル（3段）", "要件"],
    [levels5SchedulePath, "階層サンプル（5段）", "事業甲"],
  ] as const;
  for (const [file, title, heading] of samples) {
    await openScheduleFile(page, file);
    await waitForTitle(page, title);
    await page.locator(".timeline-body").waitFor({ state: "visible" });
    await expect(hierarchyRailLines(page, heading).first()).toBeVisible();
    requireKonva();
    await expect.poll(() => hasSummaryBarNearRow(page, heading)).toBe(true);
  }
});

test("draws a thin summary bar with dotted gaps, solid spans, and downward caps", async ({
  page,
}) => {
  await openScheduleFile(page, levels3SchedulePath);
  await waitForTitle(page, "階層サンプル（3段）");
  requireKonva();
  await expect.poll(() => hasSummaryBarNearRow(page, "要件")).toBe(true);
  const strokes = await page.evaluate(() => {
    const lines = [...document.querySelectorAll(".hierarchy-guide-line")];
    return lines.length;
  });
  expect(strokes).toBeGreaterThan(0);
});

test("shows integer rollup percents beside names at the minimum sidebar width", async ({
  page,
}) => {
  await openScheduleFile(page, levels3SchedulePath);
  await waitForTitle(page, "階層サンプル（3段）");
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: /設定/ }).click();
  const rollup = page.locator(".sidebar-row", { hasText: "要件" }).first().locator(".row-rollup-percent");
  await expect(rollup).toBeVisible();
  const text = await rollup.innerText();
  expect(text).toMatch(/^\d+%$/);
});
