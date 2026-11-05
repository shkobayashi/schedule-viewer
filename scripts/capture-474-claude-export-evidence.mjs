/**
 * Issue #474: settings Claude zip export UI + post-export guidance (light/dark).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/opt/cursor/artifacts";
const port = 5194;
const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";
const LS_FIRST_RUN_DISMISSED = "schedule-viewer/first-run/hint-dismissed";

function waitForServer(url, ms = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else if (Date.now() - start > ms) reject(new Error("timeout"));
          else setTimeout(tick, 400);
        })
        .on("error", () => {
          if (Date.now() - start > ms) reject(new Error("timeout"));
          else setTimeout(tick, 400);
        });
    };
    tick();
  });
}

function killPort(p) {
  try {
    spawnSync("fuser", ["-k", `${p}/tcp`], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

async function dismissBlockingUi(page) {
  const closeGuide = page.getByRole("button", { name: "閉じる" });
  if (await closeGuide.isVisible().catch(() => false)) {
    await closeGuide.click();
    await page.waitForTimeout(300);
  }
}

async function openSettingsSection(page, label) {
  await page.keyboard.press("Control+Comma");
  await page.waitForSelector(".settings-nav");
  const nav = page.locator(".settings-dialog .settings-nav");
  const button = nav.getByRole("button", { name: label, exact: true });
  await button.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  await button.click();
  await page.waitForTimeout(300);
}

async function capture(page, navLabel, exportButtonIndex, baseName, scheme) {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ colorKey, colorValue, firstRunKey }) => {
      localStorage.setItem(colorKey, colorValue);
      localStorage.setItem(firstRunKey, "1");
    },
    {
      colorKey: COLOR_SCHEME_LS_KEY,
      colorValue: scheme,
      firstRunKey: LS_FIRST_RUN_DISMISSED,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await dismissBlockingUi(page);
  await page.waitForSelector(".toolbar-title-text", { timeout: 60_000 });
  await page.waitForTimeout(800);
  await openSettingsSection(page, navLabel);
  const exportButtons = page.locator(
    'button.toolbar-btn:has-text("zip を書き出す")',
  );
  await exportButtons.nth(exportButtonIndex).click();
  await page.waitForSelector(".settings-path-list li", { timeout: 15_000 });
  await page.waitForTimeout(400);
  const dialog = page.locator(".settings-dialog");
  await dialog.screenshot({
    path: path.join(outDir, `${baseName}-${scheme}.png`),
  });
  await page.locator(".settings-dialog").getByRole("button", { name: "閉じる" }).click();
  await page.waitForTimeout(200);
}

killPort(port);
fs.mkdirSync(outDir, { recursive: true });
spawnSync("node", ["scripts/compile-validators.mjs"], { cwd: root, stdio: "inherit" });

const vite = spawn(
  "npm",
  ["run", "dev:manual-screenshot", "--", "--host", "127.0.0.1", "--port", String(port)],
  { cwd: root, stdio: "ignore", detached: true },
);

let browser;
try {
  await waitForServer(`http://127.0.0.1:${port}/`);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await capture(page, "JSON作成スキルを置く", 0, "474-settings-json-claude-export", "light");
  await capture(page, "JSON作成スキルを置く", 0, "474-settings-json-claude-export", "dark");
  await capture(page, "画面の状態を渡す", 0, "474-settings-read-screen-claude-export", "light");
  await capture(page, "画面の状態を渡す", 0, "474-settings-read-screen-claude-export", "dark");
} finally {
  if (browser) await browser.close();
  try {
    process.kill(-vite.pid, "SIGTERM");
  } catch {
    vite.kill("SIGTERM");
  }
  killPort(port);
}

console.log(`Saved 4 PNGs under ${outDir}`);
