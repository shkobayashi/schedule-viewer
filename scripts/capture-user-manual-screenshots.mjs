import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "user-manual", "images");
const colorsSchedule = path.join(root, "examples", "manual-colors.schedule.json");
const portBrowser = 5173;
const portDesktop = 5174;

function waitForServer(port, timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server on ${port} did not start in time`));
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

function startVite(mode, port) {
  const args = ["vite", "--port", String(port), "--strictPort"];
  if (mode === "manual-screenshot") {
    args.push("--mode", "manual-screenshot");
  }
  const child = spawn("npx", args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
  return child;
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) {
    await closeGuide.click();
  }
}

async function captureBrowserShots(page) {
  await page.goto(`http://localhost:${portBrowser}/`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await dismissBlockingUi(page);
  await page.waitForSelector(".toolbar-title-text");
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(outDir, "ui-overview.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /^絞り込み/ }).click();
  await page.getByLabel("担当者").selectOption({ label: "佐藤" });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "ui-filter.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");

  const fileInput = page.locator('input[type="file"]');
  await page.getByRole("button", { name: "メニュー" }).click();
  const openItem = page.getByRole("menuitem", { name: "開く" });
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    openItem.click(),
  ]);
  await fileChooser.setFiles(colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", { hasText: "操作マニュアル用の見本" });
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: path.join(outDir, "ui-colors.png"),
    fullPage: false,
  });

  await page.getByText("進行中（青）", { exact: true }).click();
  await page.waitForSelector('[aria-label="タスクの詳細"]');
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "ui-task-detail.png"),
    fullPage: false,
  });
}

async function captureDesktopChromeShots(page) {
  await page.goto(`http://localhost:${portDesktop}/`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await dismissBlockingUi(page);
  await page.waitForSelector(".toolbar-title-text");
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "メニュー" }).click();
  await page.waitForSelector('[role="menuitem"]', { hasText: "新しいウィンドウで開く" });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-menu.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: "設定" }).click();
  await page.waitForSelector(".settings-nav");
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(outDir, "ui-settings.png"),
    fullPage: false,
  });
  await page.locator(".settings-dialog").getByRole("button", { name: "閉じる" }).click();
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    window.__manualScreenshotShowPeerNotice?.();
  });
  await page.waitForSelector(".app-toast--action");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-peer-notice.png"),
    fullPage: false,
  });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  await compileValidators();

  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const browserServer = startVite("default", portBrowser);
  try {
    await waitForServer(portBrowser);
    await captureBrowserShots(page);
  } finally {
    browserServer.kill("SIGTERM");
  }

  const desktopServer = startVite("manual-screenshot", portDesktop);
  try {
    await waitForServer(portDesktop);
    await captureDesktopChromeShots(page);
  } finally {
    desktopServer.kill("SIGTERM");
  }

  await browser.close();
  console.log(`Wrote screenshots to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
