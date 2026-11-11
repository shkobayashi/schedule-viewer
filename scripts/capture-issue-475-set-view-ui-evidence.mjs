/**
 * Issue #475 — UI-state evidence for lineage + hidden milestone mark chips.
 * Reachable via existing UI only (not MCP). Viewport 1440×900, display scale auto (--s 1.15).
 * Writes artifacts and copies into docs/evidence/issue-475/ for PR durability.
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
const repoEvidenceDir = path.join(root, "docs/evidence/issue-475");
const smokeSchedule = path.join(root, "examples/regression/smoke.schedule.json");
const PORT = 5175;
const viewport = { width: 1440, height: 900 };
const MILESTONE_VIEW_TODAY = "2026-05-01";

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

async function stabilizeMilestoneViewport(page) {
  await page.waitForFunction(
    () => typeof window.__manualScreenshotSetToday === "function",
    null,
    { timeout: 60_000 },
  );
  await page.evaluate((today) => {
    window.__manualScreenshotSetToday?.(today);
    window.__manualScreenshotScrollToToday?.();
  }, MILESTONE_VIEW_TODAY);
  await page.waitForTimeout(700);
}

async function readHeaderScrollFingerprint(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".timeline-header canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const sampleW = Math.min(240, canvas.width);
    const image = ctx.getImageData(0, 0, sampleW, canvas.height);
    let sum = 0;
    for (let i = 0; i < image.data.length; i += 19) {
      sum = (sum + image.data[i]) % 1_000_000_007;
    }
    return {
      headerCanvasWidth: canvas.width,
      headerSampleSum: sum,
      bandHeight: document.querySelector(".milestone-band")?.clientHeight ?? 0,
    };
  });
}

async function closeFilterPanelIfOpen(page) {
  const panel = page.locator(".filter-panel");
  if (!(await panel.isVisible().catch(() => false))) return;
  const toggle = page.getByRole("button", { name: /^絞り込み/ });
  await toggle.click();
  await panel.waitFor({ state: "hidden", timeout: 10_000 });
}

async function clearTaskSelection(page) {
  await page.locator(".timeline-body").click({ position: { x: 36, y: 48 } });
  await page.waitForTimeout(250);
  const detail = page.locator(".detail-panel");
  if (await detail.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.locator(".sidebar-header").click();
    await page.locator(".timeline-body").click({ position: { x: 36, y: 48 } });
  }
  await detail.waitFor({ state: "hidden", timeout: 10_000 });
}

async function prepareScreenshotSurface(page) {
  await closeFilterPanelIfOpen(page);
  await clearTaskSelection(page);
  await stabilizeMilestoneViewport(page);
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
    const timelineHeader = document.querySelector(".timeline-header");
    const band = document.querySelector(".milestone-band");
    const timelineBody = document.querySelector(".timeline-body");
    const sidebarMarks = document.querySelector(".sidebar-milestone-groups");
    const nodes = [toolbar, filterBar, timelineHeader, band, timelineBody, sidebarMarks].filter(
      Boolean,
    );
    if (nodes.length === 0) return null;
    let top = Infinity;
    let bottom = -Infinity;
    for (const node of nodes) {
      const r = node.getBoundingClientRect();
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
    const padY = 12;
    const extraBody = timelineBody ? Math.min(120, timelineBody.getBoundingClientRect().height) : 0;
    return {
      x: 0,
      y: Math.max(0, top - padY),
      width: window.innerWidth,
      height: Math.min(
        window.innerHeight,
        bottom - top + padY * 2 + extraBody * 0.35,
      ),
    };
  });
  if (clip == null) throw new Error("chart context not found");
  await page.screenshot({ path: filePath, clip });
}

async function assertBaselineBandReady(page) {
  await page.waitForSelector(".milestone-band", { state: "visible", timeout: 10_000 });
  const bandHeight = await page.locator(".milestone-band").evaluate((el) => el.clientHeight);
  if (bandHeight <= 0) throw new Error("milestone band height is zero");
}

function assertMatchingViewport(before, after, label) {
  if (before == null || after == null) {
    throw new Error(`${label}: missing viewport fingerprint`);
  }
  if (before.headerCanvasWidth !== after.headerCanvasWidth) {
    throw new Error(
      `${label}: header canvas width ${before.headerCanvasWidth} vs ${after.headerCanvasWidth}`,
    );
  }
  if (before.headerSampleSum !== after.headerSampleSum) {
    throw new Error(
      `${label}: timeline scroll mismatch (header sample ${before.headerSampleSum} vs ${after.headerSampleSum})`,
    );
  }
}

async function captureBaseline(page, scheme) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, scheme);
  await applyOpen(page, smokeSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "回帰確認", timeout: 60_000 });
  await prepareScreenshotSurface(page);
  const viewportFingerprint = await readHeaderScrollFingerprint(page);
  const metrics = await readScale(page);
  await assertBaselineBandReady(page);
  const toolbarFile = path.join(artifactDir, `ui-baseline-${scheme}-toolbar-chips.png`);
  await screenshotToolbarAndChips(page, toolbarFile);
  const chartFile = path.join(artifactDir, `ui-baseline-${scheme}-chart-context.png`);
  await screenshotChartContext(page, chartFile);
  return [
    {
      file: toolbarFile,
      metrics,
      viewportFingerprint,
      caption:
        "Baseline UI (smoke, not MCP): no filter chips; toolbar before lineage chip.",
    },
    {
      file: chartFile,
      metrics,
      viewportFingerprint,
      caption:
        "Baseline UI (smoke, not MCP): milestone band at fixed scroll (today=2026-05-01); 承認 and 未確定の節目 marks expected on band (Konva).",
    },
  ];
}

async function captureAfterUi(page, scheme, baselineChartFingerprint) {
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, scheme);
  await applyOpen(page, smokeSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "回帰確認", timeout: 60_000 });
  await stabilizeMilestoneViewport(page);

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

  await prepareScreenshotSurface(page);

  const viewportFingerprint = await readHeaderScrollFingerprint(page);
  assertMatchingViewport(
    baselineChartFingerprint,
    viewportFingerprint,
    `${scheme} baseline-vs-after`,
  );

  const metrics = await readScale(page);
  await page
    .locator(".filter-chip")
    .filter({ hasText: /帯の印: 承認/ })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
  await page
    .locator(".filter-chip")
    .filter({ hasText: "系統: 設計" })
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });

  const toolbarFile = path.join(artifactDir, `ui-after-${scheme}-toolbar-chips.png`);
  await screenshotToolbarAndChips(page, toolbarFile);
  const chartFile = path.join(artifactDir, `ui-after-${scheme}-chart-context.png`);
  await screenshotChartContext(page, chartFile);
  return [
    {
      file: toolbarFile,
      metrics,
      viewportFingerprint,
      caption:
        "Equivalent UI (not MCP): chips 系統: 設計 and 帯の印: 承認（…） after toolbar + filter panel; panels closed before capture.",
    },
    {
      file: chartFile,
      metrics,
      viewportFingerprint,
      caption:
        "Equivalent UI (not MCP): same timeline header as baseline; filter hides 承認 on band while 未確定の節目 remains (compare to baseline chart-context at same scroll).",
    },
  ];
}

function mirrorArtifacts(manifest) {
  for (const dir of [storeDir, repoEvidenceDir]) {
    fs.mkdirSync(dir, { recursive: true });
    const manifestPath = path.join(dir, "manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    for (const entry of manifest) {
      const base = path.basename(entry.file);
      fs.copyFileSync(entry.file, path.join(dir, base));
    }
  }
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
      const baseline = await captureBaseline(page, scheme);
      const baselineChartFingerprint = baseline[1]?.viewportFingerprint ?? null;
      manifest.push(...baseline);
      manifest.push(...(await captureAfterUi(page, scheme, baselineChartFingerprint)));
      await context.close();
    }
    await browser.close();
    const manifestPath = path.join(artifactDir, "manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    mirrorArtifacts(manifest);
    console.log(
      JSON.stringify(
        {
          artifactDir,
          storeDir,
          repoEvidenceDir,
          manifestPath,
          items: manifest.length,
        },
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
