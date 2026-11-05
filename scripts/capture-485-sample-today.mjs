/**
 * Issue #485: sample schedule anchored to open day — light/dark screenshots.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  clearScheduleViewerLocalStorageEvaluateSource,
  SCHEDULE_VIEWER_LS_PREFIX,
} from "../src/model/devFreshStart.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/opt/cursor/artifacts";
const port = 5177;
const viewport = { width: 1440, height: 900 };
const COLOR_SCHEME_LS_KEY = `${SCHEDULE_VIEWER_LS_PREFIX}color-scheme`;
const SHOW_LIGHTNING_LS_KEY = "schedule-viewer/show-lightning";

const openDays = ["2026-03-02", "2026-10-10", "2028-06-15"];

function killPort(p) {
  try {
    spawnSync("fuser", ["-k", `${p}/tcp`], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
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

function startVite() {
  killPort(port);
  return spawn(
    "npm",
    ["run", "dev:manual-screenshot", "--", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: repoRoot, stdio: "ignore", shell: true },
  );
}

async function preparePage(page, scheme) {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate((body) => {
    const fn = eval(body);
    fn(localStorage);
  }, clearScheduleViewerLocalStorageEvaluateSource());
  await page.evaluate(
    ({ colorKey, colorValue, lightningKey }) => {
      localStorage.setItem(colorKey, colorValue);
      localStorage.setItem(lightningKey, "1");
    },
    {
      colorKey: COLOR_SCHEME_LS_KEY,
      colorValue: scheme,
      lightningKey: SHOW_LIGHTNING_LS_KEY,
    },
  );
  await page.evaluate(() => {
    localStorage.setItem("schedule-viewer/first-run/hint-dismissed", "1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".timeline", { timeout: 60_000 });
  await page.waitForSelector(".toolbar-title-text", {
    hasText: "サンプル",
    timeout: 60_000,
  });
}

async function captureDay(page, openToday, scheme) {
  await page.evaluate((today) => {
    window.__manualScreenshotSetToday?.(today);
    window.__manualScreenshotLoadSampleForToday?.(today);
  }, openToday);
  await page.waitForTimeout(600);
  const slug = openToday.replaceAll("-", "");
  const fileName = `485-sample-${slug}-${scheme}.png`;
  await page.locator(".timeline").screenshot({
    path: path.join(outDir, fileName),
    scale: "css",
  });
  console.log(`wrote ${fileName}`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const vite = startVite();
  await new Promise((r) => setTimeout(r, 2000));
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport });
    for (const scheme of ["light", "dark"]) {
      await preparePage(page, scheme);
      for (const openToday of openDays) {
        await captureDay(page, openToday, scheme);
      }
    }
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    killPort(port);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
