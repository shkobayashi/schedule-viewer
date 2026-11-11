/**
 * Issue #551 increment 2 — filter panel, active chip, diff strip (1440×900, auto scale).
 */
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "design", "screenshots", "issue-551");
const artifactDir = path.join("/opt/cursor/artifacts", "issue-551");
const playgroundSchedule = path.join(root, "examples", "playground.schedule.json");
const colorsSchedule = path.join(root, "examples", "manual-colors.schedule.json");
const PORT = 5174;
const viewport = { width: 1440, height: 900 };
const phase = process.argv.includes("--after") ? "after" : "before";
const compare = process.argv.includes("--compare-pixels");

function killOwnPort(port) {
  try {
    spawnSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore" });
  } catch {
    // best effort
  }
}

function portBusy(port) {
  try {
    const r = spawnSync("fuser", [`${port}/tcp`], { encoding: "utf8" });
    return (r.stdout || "").trim().length > 0;
  } catch {
    return false;
  }
}

function waitForServer(serverPort, timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://localhost:${serverPort}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server on ${serverPort} did not start`));
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
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("compile-validators failed"))));
  });
}

function startVite() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["vite", "--port", String(PORT), "--strictPort", "--mode", "manual-screenshot"],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } },
    );
    child.on("exit", (code) => {
      if (code !== 0 && code !== null) reject(new Error(`Vite exited ${code}`));
    });
    resolve(child);
  });
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) await closeGuide.click();
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

async function preparePage(page, colorScheme) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.setViewportSize(viewport);
  await prepareColorScheme(page, colorScheme);
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function readMetrics(page) {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        padding: cs.padding,
        gap: cs.gap,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow === "none" ? "none" : "(set)",
        height: cs.height,
      };
    };
    return {
      s: rootStyle.getPropertyValue("--s").trim(),
      filterPanel: pick(".filter-panel"),
      filterBar: pick(".filter-bar"),
      filterChip: pick(".filter-chip"),
      diffStrip: pick(".diff-strip--open"),
      diffHeader: pick(".diff-strip-header"),
      detailPanel: pick(".detail-panel"),
    };
  });
}

async function captureFilterPanel(page, scheme) {
  await preparePage(page, scheme);
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "playground", timeout: 60_000 });
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.locator(".filter-panel").waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(350);
  const metrics = await readMetrics(page);
  const file = path.join(outDir, `increment2-${phase}-${scheme}-filter-panel.png`);
  await page.locator(".filter-panel").screenshot({ path: file });
  await page.keyboard.press("Escape");
  return { case: "filter-panel", scheme, metrics, file };
}

async function captureFilterChip(page, scheme) {
  await preparePage(page, scheme);
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "playground", timeout: 60_000 });
  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.locator(".filter-panel").waitFor({ state: "visible" });
  await page.locator('[aria-label="ステータス"]').selectOption("in-progress");
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  await page.locator(".filter-panel").waitFor({ state: "hidden", timeout: 5_000 });
  await page.locator(".filter-bar .filter-chip").filter({ hasText: "進行中" }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.waitForTimeout(300);
  const metrics = await readMetrics(page);
  const file = path.join(outDir, `increment2-${phase}-${scheme}-filter-chip.png`);
  await page.locator(".filter-bar").screenshot({ path: file });
  return { case: "filter-chip", scheme, metrics, file };
}

async function captureDiffStrip(page, scheme) {
  await preparePage(page, scheme);
  await applyOpen(page, colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "操作マニュアル用の見本",
    timeout: 60_000,
  });
  const progressTask = page.getByText("進行中（青）", { exact: true });
  await progressTask.click();
  await page.locator("#detailName").fill("進行中（青・差分用）");
  await page.locator("#detailName").blur();
  await page.waitForTimeout(400);
  await page.locator(".diff-strip-handle").click();
  await page.waitForFunction(() => {
    const body = document.querySelector(".diff-strip-row-body");
    return body?.textContent?.includes("→") ?? false;
  });
  await page.locator(".diff-strip--open").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  const metrics = await readMetrics(page);
  const file = path.join(outDir, `increment2-${phase}-${scheme}-diff-strip.png`);
  await page.locator(".diff-strip--open").screenshot({ path: file });
  return { case: "diff-strip", scheme, metrics, file };
}

function comparePairs() {
  const cases = ["filter-panel", "filter-chip", "diff-strip"];
  const schemes = ["light", "dark"];
  const rows = [];
  for (const c of cases) {
    for (const scheme of schemes) {
      const before = path.join(outDir, `increment2-before-${scheme}-${c}.png`);
      const after = path.join(outDir, `increment2-after-${scheme}-${c}.png`);
      if (!fs.existsSync(before) || !fs.existsSync(after)) {
        rows.push({ case: c, scheme, status: "missing", before, after });
        continue;
      }
      const same = sha256(before) === sha256(after);
      rows.push({
        case: c,
        scheme,
        status: same ? "byte-identical" : "different",
        beforeSha: sha256(before).slice(0, 16),
        afterSha: sha256(after).slice(0, 16),
      });
    }
  }
  const out = path.join(outDir, "increment2-pixel-compare.json");
  fs.writeFileSync(out, `${JSON.stringify({ comparedAt: new Date().toISOString(), rows }, null, 2)}\n`);
  console.log(`Wrote ${out}`);
  return rows;
}

async function main() {
  if (compare) {
    comparePairs();
    return;
  }

  if (portBusy(PORT)) {
    console.error(
      `Port ${PORT} is in use; not killing foreign processes. Stop the occupant or pick another port.`,
    );
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  killOwnPort(PORT);
  await new Promise((r) => setTimeout(r, 500));
  await compileValidators();
  const vite = await startVite();
  const results = { phase, viewport, capturedAt: new Date().toISOString(), captures: [] };
  try {
    await waitForServer(PORT);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const scheme of ["light", "dark"]) {
      results.captures.push(await captureFilterPanel(page, scheme));
      results.captures.push(await captureFilterChip(page, scheme));
      results.captures.push(await captureDiffStrip(page, scheme));
    }
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killOwnPort(PORT);
  }
  const metricsPath = path.join(outDir, `increment2-${phase}-metrics.json`);
  fs.writeFileSync(metricsPath, `${JSON.stringify(results, null, 2)}\n`);
  for (const name of fs.readdirSync(outDir)) {
    if (name.startsWith("increment2-") && (name.endsWith(".png") || name.endsWith(".json"))) {
      fs.copyFileSync(path.join(outDir, name), path.join(artifactDir, name));
    }
  }
  console.log(`Wrote increment2 ${phase} artifacts to ${outDir}`);
  if (phase === "after") comparePairs();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
