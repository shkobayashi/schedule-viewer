import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "design", "screenshots");
const artifactDir = path.join("/opt/cursor/artifacts", "design-449");
const playgroundSchedule = path.join(root, "examples", "playground.schedule.json");
const colorsSchedule = path.join(root, "examples", "manual-colors.schedule.json");
const port = 5174;
const viewport = { width: 1440, height: 900 };

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
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
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

async function prepareMain(page, query = "") {
  await page.goto(`http://localhost:${port}/${query}`, {
    waitUntil: "networkidle",
  });
  await page.setViewportSize(viewport);
  await page.evaluate(() => {
    localStorage.setItem("schedule-viewer/color-scheme", "light");
  });
  await page.reload({ waitUntil: "networkidle" });
  await dismissBlockingUi(page);
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "playground",
    timeout: 60_000,
  });
  await page.waitForTimeout(600);
}

async function openSettings(page) {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: "設定", exact: true }).click();
  await page.waitForSelector(".settings-dialog");
  await page.waitForTimeout(400);
}

async function captureInventory(page) {
  await prepareMain(page);
  await page.screenshot({
    path: path.join(outDir, "inventory-main.png"),
  });

  await page.locator(".milestone-band").screenshot({
    path: path.join(outDir, "inventory-milestone-band.png"),
  });

  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "inventory-filter-panel.png"),
  });
  await page.keyboard.press("Escape");

  await openSettings(page);
  await page.screenshot({
    path: path.join(outDir, "inventory-settings.png"),
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
    path: path.join(outDir, "inventory-diff-panel.png"),
  });
  await applyOpen(page, playgroundSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "playground" });
  await page.waitForTimeout(400);

  await page.evaluate(() => window.__manualScreenshotShowExplainOverlay?.());
  await page.waitForSelector(".explanation-sidebar-veil", { timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(outDir, "inventory-explain-overlay.png"),
  });
  await page.evaluate(() => {
    document.querySelector(".explanation-konva-veil");
  });

  const taskLabel = page.getByText("要件定義書作成", { exact: true }).first();
  await taskLabel.click({ button: "right" });
  await page.waitForSelector(".context-menu");
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(outDir, "inventory-context-menu.png"),
  });
  await page.keyboard.press("Escape");

  await taskLabel.click();
  await page.waitForSelector('[aria-label="タスクの詳細"]');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "inventory-task-detail.png"),
  });
}

async function captureDirection(page, id, labelPrefix) {
  const query = id ? `?designDirection=${id}` : "";
  await prepareMain(page, query);
  await page.screenshot({
    path: path.join(outDir, `${labelPrefix}-main.png`),
  });
  await openSettings(page);
  await page.screenshot({
    path: path.join(outDir, `${labelPrefix}-settings-dialog.png`),
  });
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
    await captureInventory(page);
    await captureDirection(page, "", "design-baseline");
    await captureDirection(page, "linear", "design-A-linear");
    await captureDirection(page, "raycast", "design-B-raycast");
    await captureDirection(page, "compact", "design-C-compact");
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
