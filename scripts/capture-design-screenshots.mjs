import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  stitchLabeledRow,
  stitchLabeledRowFromPaths,
} from "./compose-design-comparisons.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "design", "screenshots");
const artifactDir = path.join("/opt/cursor/artifacts", "design-449");
const playgroundSchedule = path.join(root, "examples", "playground.schedule.json");
const colorsSchedule = path.join(root, "examples", "manual-colors.schedule.json");
const port = 5174;
const viewport = { width: 1440, height: 900 };

const DIRECTIONS = [
  { id: "", prefix: "design-baseline", label: "現状" },
  { id: "linear", prefix: "design-A-linear", label: "A Linear" },
  { id: "raycast", prefix: "design-B-raycast", label: "B Raycast" },
  { id: "compact", prefix: "design-C-compact", label: "C 高密度" },
];

/** Dark-mode previews: baseline app chrome vs B Raycast only. */
const DARK_DIRECTIONS = [
  { id: "", prefix: "design-baseline-dark", label: "現状ダーク" },
  { id: "raycast", prefix: "design-B-raycast-dark", label: "B Raycast ダーク" },
];

const captureDarkOnly = process.argv.includes("--capture-dark-only");
const capturePhase3Only = process.argv.includes("--phase3-evidence");
const capturePhase3BeforeOnly = process.argv.includes("--phase3-before-only");
const captureLegacyDirections = process.argv.includes("--legacy-directions");
const viteRoot = process.env.BASELINE_ROOT
  ? path.resolve(process.env.BASELINE_ROOT)
  : root;

const INVENTORY_SUFFIXES = [
  "main",
  "milestone-band",
  "filter-panel",
  "settings",
  "diff-panel",
  "explain-overlay",
  "context-menu",
  "task-detail",
];

async function captureInventory(page, { namePrefix = "inventory", colorScheme = "light" } = {}) {
  const file = (suffix) => path.join(outDir, `${namePrefix}-${suffix}.png`);
  await prepareMain(page, "", colorScheme);
  await page.screenshot({
    path: file("main"),
  });

  await page.locator(".milestone-band").screenshot({
    path: file("milestone-band"),
  });

  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: file("filter-panel"),
  });
  await page.keyboard.press("Escape");

  await openSettings(page);
  await page.screenshot({
    path: file("settings"),
  });
  await page.locator(".settings-dialog").getByRole("button", { name: "閉じる" }).click();
  await page.waitForTimeout(300);

  await applyOpen(page, colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "操作マニュアル用の見本",
    timeout: 60_000,
  });
  await page.waitForTimeout(400);
  const progressTask = page.getByText("進行中（青）", { exact: true });
  await progressTask.click();
  await page.locator("#detailName").fill("進行中（青・差分用）");
  await page.locator("#detailName").blur();
  await page.waitForTimeout(400);
  await page.locator(".diff-strip-handle").click();
  await page.waitForFunction(() => {
    const list = document.querySelector(".diff-strip-list");
    const body = document.querySelector(".diff-strip-row-body");
    const text = `${list?.textContent ?? ""}${body?.textContent ?? ""}`;
    return text.includes("→");
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: file("diff-panel"),
  });
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "playground" });
  await page.waitForTimeout(400);

  const canShowExplain = await page.evaluate(
    () => typeof window.__manualScreenshotShowExplainOverlay === "function",
  );
  if (canShowExplain) {
    await page.evaluate(() => window.__manualScreenshotShowExplainOverlay?.());
    await page.waitForSelector(".explanation-sidebar-veil", { timeout: 15_000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: file("explain-overlay"),
    });
  } else {
    console.warn(
      `${namePrefix}: skipping explain-overlay (manual-screenshot hook unavailable)`,
    );
  }

  const taskLabel = page.getByText("要件定義書作成", { exact: true }).first();
  await taskLabel.click({ button: "right" });
  await page.waitForSelector(".context-menu");
  await page.waitForTimeout(250);
  await page.screenshot({
    path: file("context-menu"),
  });
  await page.keyboard.press("Escape");

  await taskLabel.click();
  await page.waitForSelector('[aria-label="タスクの詳細"]');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: file("task-detail"),
  });
}

async function buildPhase3Comparisons() {
  const pairs = [
    { suffix: "main", height: 720, useFromPaths: false },
    { suffix: "settings", height: 640, useFromPaths: false },
    { suffix: "explain-overlay", height: 720, useFromPaths: false },
  ];
  for (const scheme of ["light", "dark"]) {
    const beforeLabel = scheme === "light" ? "feature-436 ライト" : "feature-436 ダーク";
    const afterLabel = scheme === "light" ? "Raycast 標準 ライト" : "Raycast 標準 ダーク";
    for (const { suffix, height, useFromPaths } of pairs) {
      const beforePath = path.join(
        outDir,
        `phase3-before-${scheme}-inventory-${suffix}.png`,
      );
      const afterPath = path.join(
        outDir,
        `phase3-after-${scheme}-inventory-${suffix}.png`,
      );
      if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
        console.warn(`Skip compare-phase3-${suffix}-${scheme}: missing before/after PNG`);
        continue;
      }
      const stitch = useFromPaths ? stitchLabeledRowFromPaths : stitchLabeledRow;
      await stitch(
        [beforePath, afterPath],
        [beforeLabel, afterLabel],
        path.join(outDir, `compare-phase3-${suffix}-${scheme}.png`),
        height,
      );
    }
  }
}

function waitForServer(timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server on ${port} did not start`));
          return;
        }
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function compileValidators() {
  await new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/compile-validators.mjs"], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error("compile-validators failed"));
    });
  });
}

function startVite() {
  const child = spawn(
    "npx",
    ["vite", "--port", String(port), "--strictPort", "--mode", "manual-screenshot"],
    { cwd: viteRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout?.on("data", (c) => process.stdout.write(c));
  child.stderr?.on("data", (c) => process.stderr.write(c));
  return child;
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) {
    await closeGuide.click();
  }
}

async function applyOpen(page, filePath) {
  await page.waitForFunction(
    () => typeof window.__manualScreenshotApplyOpen === "function",
    null,
    { timeout: 60_000 },
  );
  const contents = fs.readFileSync(filePath, "utf8");
  const mockPath = `/Users/example/Documents/${path.basename(filePath)}`;
  await page.evaluate(
    async ({ mockPath, contents }) => {
      await window.__manualScreenshotApplyOpen?.({ path: mockPath, contents });
    },
    { mockPath, contents },
  );
}

async function prepareMain(page, query = "", colorScheme = "light") {
  const param = query.startsWith("?") ? query.slice(1) : query;
  const url = param
    ? `http://localhost:${port}/?${param}`
    : `http://localhost:${port}/`;
  await page.goto(url, {
    waitUntil: "networkidle",
  });
  await page.setViewportSize(viewport);
  await page.evaluate((scheme) => {
    localStorage.setItem("schedule-viewer/color-scheme", scheme);
  }, colorScheme);
  await page.reload({ waitUntil: "networkidle" });
  if (colorScheme === "dark") {
    await page.waitForFunction(
      () => document.documentElement.dataset.colorScheme === "dark",
      null,
      { timeout: 30_000 },
    );
  }
  await dismissBlockingUi(page);
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "playground",
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
}

async function expandSidebar(page) {
  const collapsed = page.locator('button.twist[aria-expanded="false"]');
  for (let i = 0; i < 14; i += 1) {
    if ((await collapsed.count()) === 0) break;
    await collapsed.first().click();
    await page.waitForTimeout(120);
  }
}

async function showSelectionAndHover(page) {
  await expandSidebar(page);
  const selected = page.getByText("要件定義書作成", { exact: true }).first();
  await selected.click();
  await page.waitForTimeout(200);
  const hoverTarget = page.getByText("要件レビュー", { exact: true }).first();
  await hoverTarget.hover();
  await page.waitForTimeout(350);
}

async function openSettings(page) {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: "設定", exact: true }).click();
  await page.waitForSelector(".settings-dialog");
  await page.waitForTimeout(400);
}

async function captureDirection(page, { id, prefix }, colorScheme = "light") {
  if (id) {
    console.warn("designDirection query removed; capturing default chrome only");
  }
  await prepareMain(page, "", colorScheme);
  await showSelectionAndHover(page);
  await page.screenshot({
    path: path.join(outDir, `${prefix}-main.png`),
  });
  await page.locator(".toolbar").screenshot({
    path: path.join(outDir, `${prefix}-crop-toolbar.png`),
  });
  await page.locator(".sidebar").screenshot({
    path: path.join(outDir, `${prefix}-crop-sidebar.png`),
  });
  await openSettings(page);
  await page.screenshot({
    path: path.join(outDir, `${prefix}-settings-dialog.png`),
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

async function buildDarkComparisons() {
  const labels = DARK_DIRECTIONS.map((d) => d.label);
  const pairs = [
    {
      suffix: "main",
      out: "compare-main-baseline-B-dark.png",
      height: 720,
      fromPaths: false,
    },
    {
      suffix: "crop-toolbar",
      out: "compare-crop-toolbar-baseline-B-dark.png",
      height: 120,
      fromPaths: true,
    },
    {
      suffix: "crop-sidebar",
      out: "compare-crop-sidebar-baseline-B-dark.png",
      height: 420,
      fromPaths: true,
    },
  ];
  for (const { suffix, out, height, fromPaths } of pairs) {
    const imagePaths = DARK_DIRECTIONS.map((d) =>
      path.join(outDir, `${d.prefix}-${suffix}.png`),
    );
    const stitch = fromPaths ? stitchLabeledRowFromPaths : stitchLabeledRow;
    await stitch(imagePaths, labels, path.join(outDir, out), height);
  }
}

async function buildComparisons() {
  const mainPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-main.png`),
  );
  const settingsPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-settings-dialog.png`),
  );
  const toolbarPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-crop-toolbar.png`),
  );
  const sidebarPaths = DIRECTIONS.map((d) =>
    path.join(outDir, `${d.prefix}-crop-sidebar.png`),
  );
  const labels = DIRECTIONS.map((d) => d.label);

  await stitchLabeledRow(
    mainPaths,
    labels,
    path.join(outDir, "compare-main-baseline-A-B-C.png"),
    720,
  );
  await stitchLabeledRow(
    settingsPaths,
    labels,
    path.join(outDir, "compare-settings-baseline-A-B-C.png"),
    640,
  );
  await stitchLabeledRowFromPaths(
    toolbarPaths,
    labels,
    path.join(outDir, "compare-crop-toolbar-baseline-A-B-C.png"),
    120,
  );
  await stitchLabeledRowFromPaths(
    sidebarPaths,
    labels,
    path.join(outDir, "compare-crop-sidebar-baseline-A-B-C.png"),
    420,
  );
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  await compileValidators();
  const vite = startVite();
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    if (capturePhase3BeforeOnly) {
      for (const scheme of ["light", "dark"]) {
        await captureInventory(page, {
          namePrefix: `phase3-before-${scheme}-inventory`,
          colorScheme: scheme,
        });
      }
    } else if (capturePhase3Only) {
      await captureInventory(page, {
        namePrefix: "phase3-after-light-inventory",
        colorScheme: "light",
      });
      await captureInventory(page, {
        namePrefix: "phase3-after-dark-inventory",
        colorScheme: "dark",
      });
      await captureInventory(page, { namePrefix: "inventory", colorScheme: "light" });
      await buildPhase3Comparisons();
    } else if (!captureDarkOnly) {
      await captureInventory(page, { namePrefix: "inventory", colorScheme: "light" });
      if (captureLegacyDirections) {
        for (const dir of DIRECTIONS) {
          await captureDirection(page, dir);
        }
        await buildComparisons();
      }
    }
    if (captureLegacyDirections || captureDarkOnly) {
      for (const dir of DARK_DIRECTIONS) {
        await captureDirection(page, dir, "dark");
      }
      await buildDarkComparisons();
    }
    await browser.close();
    for (const name of fs.readdirSync(outDir)) {
      if (!name.endsWith(".png")) continue;
      fs.copyFileSync(
        path.join(outDir, name),
        path.join(artifactDir, name),
      );
    }
    console.log(`Wrote ${outDir} and copied to ${artifactDir}`);
  } finally {
    vite.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
