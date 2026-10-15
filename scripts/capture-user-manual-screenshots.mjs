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
const SIDEBAR_WIDTH_LS_KEY = "schedule-viewer/sidebar-width";

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

async function setSidebarWidth(page, widthPx) {
  await page.evaluate(
    ({ key, width }) => {
      localStorage.setItem(key, String(width));
    },
    { key: SIDEBAR_WIDTH_LS_KEY, width: widthPx },
  );
}

async function applyDesktopOpen(page, filePath) {
  await page.waitForFunction(
    () => typeof window.__manualScreenshotApplyOpen === "function",
    null,
    { timeout: 60_000 },
  );
  const contents = fs.readFileSync(filePath, "utf8");
  const mockPath = `/Users/example/Documents/${path.basename(filePath)}`;
  await page.evaluate(
    async ({ mockPath, contents }) => {
      const apply = window.__manualScreenshotApplyOpen;
      if (!apply) {
        throw new Error("manual screenshot open bridge is missing");
      }
      await apply({ path: mockPath, contents });
    },
    { mockPath, contents },
  );
}

async function expandAllSidebarRows(page) {
  const collapsed = page.locator('button.twist[aria-expanded="false"]');
  for (let i = 0; i < 12; i += 1) {
    if ((await collapsed.count()) === 0) break;
    await collapsed.first().click();
    await page.waitForTimeout(120);
  }
}

async function openColorsScheduleBrowser(page) {
  await page.getByRole("button", { name: "メニュー" }).click();
  const openItem = page.getByRole("menuitem", { name: "開く" });
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    openItem.click(),
  ]);
  await fileChooser.setFiles(colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "操作マニュアル用の見本",
  });
  await page.waitForTimeout(800);
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

  await setSidebarWidth(page, 400);
  await page.reload({ waitUntil: "networkidle" });
  await dismissBlockingUi(page);
  await page.waitForSelector(".toolbar-title-text");
  await openColorsScheduleBrowser(page);
  await page.screenshot({
    path: path.join(outDir, "ui-colors.png"),
    fullPage: false,
  });

  await page.getByText("進行中（青）", { exact: true }).click();
  await page.waitForSelector('[aria-label="タスクの詳細"]');
  const detail = page.locator('[aria-label="タスクの詳細"]');
  await detail.evaluate((el) => {
    el.scrollTop = 280;
  });
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(outDir, "ui-task-detail.png"),
    fullPage: false,
  });
}

async function openSettings(page) {
  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: "設定" }).click();
  await page.waitForSelector(".settings-nav");
  await page.locator(".settings-nav").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(400);
}

function settingsNav(page) {
  return page.locator(".settings-dialog .settings-nav");
}

async function ensureSettingsNavItemVisible(page, name) {
  const nav = settingsNav(page);
  await nav.waitFor({ state: "visible" });
  const button = nav.getByRole("button", { name, exact: true });
  await button.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  await button.waitFor({ state: "visible" });
}

async function clickSettingsNav(page, name) {
  await ensureSettingsNavItemVisible(page, name);
  await settingsNav(page).getByRole("button", { name, exact: true }).click();
}

async function closeSettings(page) {
  await page.locator(".settings-dialog").getByRole("button", { name: "閉じる" }).click();
  await page.waitForTimeout(300);
}

async function captureDesktopChromeShots(page) {
  await page.goto(`http://localhost:${portDesktop}/`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1440, height: 1100 });
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

  await openSettings(page);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.waitForTimeout(200);
  for (const name of [
    "表示",
    "メンバー",
    "稼働日",
    "更新",
    "画面の状態を渡す",
    "JSON作成スキルを置く",
  ]) {
    await ensureSettingsNavItemVisible(page, name);
  }
  await clickSettingsNav(page, "表示");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-settings.png"),
    fullPage: false,
  });
  await closeSettings(page);

  await applyDesktopOpen(page, colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "操作マニュアル用の見本",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  await expandAllSidebarRows(page);

  const progressTask = page.getByText("進行中（青）", { exact: true });
  if ((await progressTask.count()) === 0) {
    const title = await page.locator(".toolbar-title-text").textContent();
    const sidebar = await page.locator(".sidebar-viewport").innerText();
    throw new Error(
      `colors schedule tasks missing. title=${title}\nsidebar=${sidebar.slice(0, 800)}`,
    );
  }
  await progressTask.click();
  await page.locator("#detailName").fill("進行中（青・差分用）");
  await page.locator("#detailName").blur();
  await page.waitForTimeout(400);
  await page.locator(".diff-strip-handle").click();
  await page.waitForFunction(() => {
    const area = document.querySelector(".diff-strip-textarea");
    return area instanceof HTMLTextAreaElement && area.value.includes("→");
  });
  await page.getByRole("heading", { name: "差分", level: 2 }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-diff.png"),
    fullPage: false,
  });
  await page.waitForTimeout(300);

  await applyDesktopOpen(page, colorsSchedule);
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "操作マニュアル用の見本",
  });
  await expandAllSidebarRows(page);
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: "メニュー" }).click();
  await page.getByRole("menuitem", { name: "書き出し" }).click();
  await page.getByRole("heading", { name: "書き出し" }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-export.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "キャンセル" }).click();
  await page.waitForTimeout(300);

  const taskRow = page.getByText("進行中（青）", { exact: true });
  await taskRow.click({ button: "right" });
  await page.waitForSelector(".context-menu");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-context-menu.png"),
    fullPage: false,
  });
  await page.getByRole("menuitem", { name: "複製" }).click();
  await page.getByRole("heading", { name: "タスクを複製" }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-task-duplicate.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "キャンセル" }).click();
  await page.waitForTimeout(300);

  await taskRow.click({ button: "right" });
  await page.getByRole("menuitem", { name: "ノート" }).click();
  await page.getByRole("heading", { name: "進行中（青）" }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-task-note.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "キャンセル" }).click();
  await page.waitForTimeout(300);

  await page
    .getByRole("button", { name: "追加 ⌘+Enter / Insert" })
    .click();
  await page.getByRole("heading", { name: "タスク追加" }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-task-add.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "キャンセル" }).click();
  await page.waitForTimeout(300);

  await openSettings(page);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.waitForTimeout(200);
  await clickSettingsNav(page, "メンバー");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "ui-settings-members.png"),
    fullPage: false,
  });
  await clickSettingsNav(page, "稼働日");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "ui-settings-calendar.png"),
    fullPage: false,
  });
  await clickSettingsNav(page, "更新");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "ui-settings-updates.png"),
    fullPage: false,
  });
  await clickSettingsNav(page, "画面の状態を渡す");
  await page.waitForSelector("h3.settings-changelog-heading");
  await page.waitForSelector(".settings-mcp-json");
  await page.waitForFunction(() => {
    const area = document.querySelector(".settings-mcp-json");
    return area instanceof HTMLTextAreaElement && area.value.includes("schedule-viewer");
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-settings-mcp.png"),
    fullPage: false,
  });
  await clickSettingsNav(page, "JSON作成スキルを置く");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(outDir, "ui-settings-skills.png"),
    fullPage: false,
  });
  await closeSettings(page);

  await page.goto(`http://localhost:${portDesktop}/`, { waitUntil: "networkidle" });
  await dismissBlockingUi(page);
  await page.waitForSelector(".toolbar-title-text");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__manualScreenshotShowPeerNotice?.();
  });
  await page.waitForSelector(".app-toast--action");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-peer-notice.png"),
    fullPage: false,
  });

  await page.evaluate(() => {
    window.__manualScreenshotHidePeerNotice?.();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__manualScreenshotShowUpdateOffer?.();
  });
  await page.waitForSelector(".app-update-offer");
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(outDir, "ui-update-offer.png"),
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
