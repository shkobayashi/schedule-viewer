/**
 * Crop compare of toolbar title + pencil: before (1016a0e) vs after (fix).
 * Output: /cursor/stores/self/dialog-shell/compare-toolbar-title-pencil-{light,dark}.png
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { stitchLabeledRowFromPaths } from "./compose-design-comparisons.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const beforeRoot = process.env.PENCIL_BEFORE_ROOT ?? repoRoot;
const afterRoot = process.env.PENCIL_AFTER_ROOT ?? repoRoot;
const outDir = path.join("/cursor/stores/self", "dialog-shell");
const tmpDir = path.join("/opt/cursor/artifacts", "toolbar-pencil-capture");
const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";

async function applyColorScheme(page, port, scheme) {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: COLOR_SCHEME_LS_KEY, value: scheme },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.colorScheme === expected,
    scheme,
    { timeout: 30_000 },
  );
  await page.waitForSelector(".toolbar-title-edit-btn", { timeout: 60_000 });
  await page.waitForTimeout(300);
}

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

async function captureTitleCrop(captureRoot, port, scheme, outPath) {
  killPort(port);
  const vite = spawn(
    "npm",
    [
      "run",
      "dev:manual-screenshot",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: captureRoot, stdio: "ignore", env: { ...process.env } },
  );
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await applyColorScheme(page, port, scheme);
    const btn = page.locator(".toolbar-title-edit-btn");
    await btn.waitFor({ state: "visible" });
    const box = await page.locator(".toolbar-title").boundingBox();
    if (!box) throw new Error("toolbar-title box missing");
    await page.screenshot({
      path: outPath,
      clip: {
        x: Math.max(0, box.x - 8),
        y: Math.max(0, box.y - 4),
        width: Math.min(1440, box.width + 16),
        height: box.height + 8,
      },
    });
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killPort(port);
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  for (const scheme of ["light", "dark"]) {
    const beforePath = path.join(tmpDir, `before-${scheme}.png`);
    const afterPath = path.join(tmpDir, `after-${scheme}.png`);
    await captureTitleCrop(beforeRoot, 5185, scheme, beforePath);
    await captureTitleCrop(afterRoot, 5186, scheme, afterPath);
    const comparePath = path.join(
      outDir,
      `compare-toolbar-title-pencil-${scheme}.png`,
    );
    await stitchLabeledRowFromPaths(
      [beforePath, afterPath],
      ["変更前", "変更後"],
      comparePath,
      48,
    );
    console.log(`Wrote ${comparePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
