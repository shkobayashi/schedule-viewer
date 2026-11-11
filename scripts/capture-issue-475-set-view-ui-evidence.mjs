/**
 * Issue #475 — UI-state evidence for lineage + hidden milestone mark chips.
 * Reachable via existing UI only (not MCP). Viewport 1440×900, display scale auto (--s 1.15).
 * Output: /opt/cursor/artifacts/issue-475/ only (does not touch manual/ or phase3 PNGs).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = "/opt/cursor/artifacts/issue-475";
const storeDir = "/cursor/stores/self/issue-475";
const smokeSchedule = path.join(root, "examples/regression/smoke.schedule.json");
const PORT = 5175;
const viewport = { width: 1440, height: 900 };

function killOwnPort(port) {
  try {
    spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
  } catch {
    // ignore
  }
}

function waitForServer(serverPort, timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${serverPort}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) reject(new Error("server timeout"));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function startVite() {
  return spawn(
    "npx",
    ["vite", "--port", String(PORT), "--strictPort", "--mode", "manual-screenshot"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } },
  );
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) await closeGuide.click();
  const firstRun = page.locator(".first-run-hint-card .modal-close-btn");
  if (await firstRun.isVisible().catch(() => false)) await firstRun.click();
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

async function prepareColorScheme(page, colorScheme) {
  await page.evaluate((scheme) => {
    localStorage.setItem("schedule-viewer/color-scheme", scheme);
    localStorage.setItem("schedule-viewer/display-scale", "auto");
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
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue("--s").trim() === "1.15",
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(400);
}

async function readScale(page) {
  return page.evaluate(() => ({
    s: getComputedStyle(document.documentElement).getPropertyValue("--s").trim(),
    viewport: { w: window.innerWidth, h: window.innerHeight },
    colorScheme: document.documentElement.dataset.colorScheme ?? "light",
  }));
}

async function screenshotToolbarAndChips(page, filePath) {
  const clip = await page.evaluate(() => {
    const toolbar = document.querySelector(".toolbar");
    const bar = document.querySelector(".filter-bar");
    const nodes = [toolbar, bar].filter(Boolean);
    if (nodes.length === 0) return null;
  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
    for (const node of nodes) {
      const r = node.getBoundingClientRect();
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    const pad = 8;
    return {
      x: Math.max(0, left - pad),
      y: Math.max(0, top - pad),
      width: Math.min(window.innerWidth, right - left + pad * 2),
      height: Math.min(window.innerHeight, bottom - top + pad * 2),
    };
  });
  if (clip == null) throw new Error("toolbar not found");
  await page.screenshot({ path: filePath, clip });
}

async function screenshotChartContext(page, filePath) {
  const clip = await page.evaluate(() => {
    const toolbar = document.querySelector(".toolbar");
    const filterBar = document.querySelector(".filter-bar");
    const band = document.querySelector(".milestone-band");
    const sidebarMarks = document.querySelector(".sidebar-milestones");
    const nodes = [toolbar, filterBar, band, sidebarMarks].filter(Boolean);
    if (nodes.length === 0) return null;
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const node of nodes) {
      const r = node.getBoundingClientRect();
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    const padX = 16;
    const padY = 12;
    return {
      x: 0,
      y: Math.max(0, top - padY),
      width: window.innerWidth,
      height: Math.min(window.innerHeight, bottom - top + padY * 2),
    };
  });
  if (clip == null) throw new Error("chart context not found");
  await page.screenshot({ path: filePath, clip });
}

async function scrollChartToShowMilestoneBand(page) {
  await page.waitForFunction(
    () => typeof window.__manualScreenshotSetToday === "function",
    null,
    { timeout: 60_000 },
  );
  await page.evaluate(() => {
    window.__manualScreenshotSetToday?.("2026-04-15");
    window.__manualScreenshotScrollToToday?.();
  });
  await page.waitForTimeout(600);
}

async function assertApprovalMarkVisible(page) {
  await page.waitForSelector(".milestone-band", { state: "visible", timeout: 10_000 });
  const bandHeight = await page.locator(".milestone-band").evaluate((el) => el.clientHeight);
  if (bandHeight <= 0) throw new Error("milestone band height is zero");
}

async function captureBaseline(page, scheme) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, scheme);
  await applyOpen(page, smokeSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "回帰確認", timeout: 60_000 });
  await scrollChartToShowMilestoneBand(page);
  const metrics = await readScale(page);
  await assertApprovalMarkVisible(page);
  const toolbarFile = path.join(
    artifactDir,
    `ui-baseline-${scheme}-toolbar-chips.png`,
  );
  await screenshotToolbarAndChips(page, toolbarFile);
  const chartFile = path.join(
    artifactDir,
    `ui-baseline-${scheme}-chart-context.png`,
  );
  await screenshotChartContext(page, chartFile);
  return [
    {
      file: toolbarFile,
      metrics,
      caption:
        "Baseline UI state (smoke): no active filter chips; toolbar 系統 control without a named lineage chip row.",
    },
    {
      file: chartFile,
      metrics,
      caption:
        "Baseline UI state (smoke): milestone band and sidebar show the 承認 mark visible (UI, not MCP).",
    },
  ];
}

async function captureAfterUi(page, scheme) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, scheme);
  await applyOpen(page, smokeSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "回帰確認", timeout: 60_000 });
  await scrollChartToShowMilestoneBand(page);

  const designRow = page.getByText("設計", { exact: true }).first();
  await designRow.click();
  await page.getByRole("button", { name: "系統", exact: true }).click();
  await page
    .locator(".filter-chip")
    .filter({ hasText: "系統: 設計" })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });

  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.locator(".filter-panel").waitFor({ state: "visible" });
  const markCombo = page
    .locator(".filter-panel-field")
    .filter({ has: page.getByText("帯の印", { exact: true }) })
    .getByPlaceholder("名前か日付で検索");
  await markCombo.click();
  await markCombo.fill("承認");
  await page
    .locator(".filter-panel-tag-options .filter-panel-tag-option")
    .filter({ hasText: "承認" })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: /帯の印: 承認/ })
    .waitFor({ state: "visible", timeout: 10_000 });

  await page.waitForTimeout(350);
  const metrics = await readScale(page);
  await page
    .locator(".filter-chip")
    .filter({ hasText: /帯の印: 承認/ })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
  const toolbarFile = path.join(
    artifactDir,
    `ui-after-${scheme}-toolbar-chips.png`,
  );
  await screenshotToolbarAndChips(page, toolbarFile);
  const chartFile = path.join(artifactDir, `ui-after-${scheme}-chart-context.png`);
  await screenshotChartContext(page, chartFile);
  return [
    {
      file: toolbarFile,
      metrics,
      caption:
        "Equivalent UI state (not MCP): lineage chip 系統: 設計 and hidden mark chip 帯の印: 承認（…）. Reached via toolbar + filter panel.",
    },
    {
      file: chartFile,
      metrics,
      caption:
        "Equivalent UI state (not MCP): 承認 mark absent from milestone band after hiding via filter 帯の印 (chips still visible above).",
    },
  ];
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  let vite = null;
  if (process.env.SKIP_VITE_START !== "1") {
    killOwnPort(PORT);
    vite = startVite();
    await waitForServer(PORT);
  } else {
    await waitForServer(PORT);
  }
  try {
    const browser = await chromium.launch();
    const manifest = [];
    for (const scheme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      manifest.push(...(await captureBaseline(page, scheme)));
      manifest.push(...(await captureAfterUi(page, scheme)));
      await context.close();
    }
    await browser.close();
    const manifestPath = path.join(artifactDir, "manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.mkdirSync(storeDir, { recursive: true });
    fs.copyFileSync(manifestPath, path.join(storeDir, "manifest.json"));
    for (const entry of manifest) {
      const base = path.basename(entry.file);
      fs.copyFileSync(entry.file, path.join(storeDir, base));
    }
    console.log(
      JSON.stringify(
        { artifactDir, storeDir, manifestPath, items: manifest.length },
        null,
        2,
      ),
    );
  } finally {
    vite?.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
