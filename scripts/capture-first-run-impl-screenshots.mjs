/**
 * PR evidence for NAV-09 first-run guidance (#469).
 * Output: /cursor/stores/self/first-run-impl/*.png
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join("/cursor/stores/self", "first-run-impl");
const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";
const LS_HINT_DISMISSED = "schedule-viewer/first-run/hint-dismissed";
const LS_SAVE_HINT_COMPLETED = "schedule-viewer/first-run/save-hint-completed";

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

async function applyScheme(page, port, scheme, firstRunKeys) {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ colorKey, colorValue, keys }) => {
      localStorage.setItem(colorKey, colorValue);
      for (const [k, v] of Object.entries(keys)) {
        if (v == null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      }
    },
    {
      colorKey: COLOR_SCHEME_LS_KEY,
      colorValue: scheme,
      keys: firstRunKeys,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.colorScheme === expected,
    scheme,
    { timeout: 30_000 },
  );
  await page.waitForSelector(".toolbar", { timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function captureSet(port) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const scheme of ["light", "dark"]) {
    await applyScheme(page, port, scheme, {
      [LS_HINT_DISMISSED]: null,
      [LS_SAVE_HINT_COMPLETED]: null,
    });
    await page.waitForSelector(".first-run-hint-card", { timeout: 60_000 });
    const card = page.locator(".first-run-hint-card");
    await card.screenshot({
      path: path.join(outDir, `first-run-card-${scheme}.png`),
    });

    await page.locator(".app-menu button").first().click();
    await page.waitForSelector(".app-menu-item-hint", { timeout: 10_000 });
    const menuPanel = page.locator(".app-menu-panel");
    await menuPanel.screenshot({
      path: path.join(outDir, `recent-files-empty-hint-${scheme}.png`),
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    await page.evaluate(
      ({ hintKey, saveKey }) => {
        localStorage.setItem(hintKey, "1");
        localStorage.removeItem(saveKey);
      },
      { hintKey: LS_HINT_DISMISSED, saveKey: LS_SAVE_HINT_COMPLETED },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".toolbar", { timeout: 60_000 });
    const firstTask = page.locator(".sidebar-row.task").first();
    await firstTask.click();
    await page.locator(".toolbar-title-edit-btn").click();
    await page.locator(".toolbar-title-input").fill("初回保存ヒント確認");
    await page.locator(".toolbar-title-input").press("Enter");
    await page.waitForSelector(".status-bar-first-run-hint", {
      timeout: 30_000,
    });
    const statusBar = page.locator(".status-bar");
    await statusBar.screenshot({
      path: path.join(outDir, `save-hint-pill-${scheme}.png`),
    });
  }

  await browser.close();
}

async function main() {
  const port = 5173;
  killPort(port);
  const vite = spawn(
    "npm",
    ["run", "dev:manual-screenshot", "--", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: repoRoot, stdio: "ignore" },
  );
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    await captureSet(port);
    console.log(`Wrote screenshots to ${outDir}`);
  } finally {
    vite.kill("SIGTERM");
    killPort(port);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
