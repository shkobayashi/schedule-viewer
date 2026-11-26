/**
 * NAV-09 checklist card screenshots → /cursor/stores/self/first-run-impl/
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import {
  clearScheduleViewerLocalStorageEvaluateSource,
  SCHEDULE_VIEWER_LS_PREFIX,
} from "../src/model/devFreshStart.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join("/cursor/stores/self", "first-run-impl");
const scheduleFixture = path.join(repoRoot, "examples/playground.schedule.json");
const COLOR_SCHEME_LS_KEY = `${SCHEDULE_VIEWER_LS_PREFIX}color-scheme`;

async function clearAppLocalStorage(page: Page): Promise<void> {
  await page.evaluate((body) => {
    const fn = eval(body) as (storage: Storage) => void;
    fn(localStorage);
  }, clearScheduleViewerLocalStorageEvaluateSource());
}

function waitForServer(url: string, ms = 120_000): Promise<void> {
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

function killPort(p: number): void {
  try {
    spawnSync("fuser", ["-k", `${p}/tcp`], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

async function bootPage(
  page: Page,
  port: number,
  scheme: "light" | "dark",
): Promise<void> {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await clearAppLocalStorage(page);
  await page.evaluate(
    ({ colorKey, colorValue }) => {
      localStorage.setItem(colorKey, colorValue);
    },
    { colorKey: COLOR_SCHEME_LS_KEY, colorValue: scheme },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".toolbar", { timeout: 60_000 });
  await page.waitForTimeout(400);
}

async function captureChecklistZero(page: Page, scheme: "light" | "dark"): Promise<void> {
  await page.waitForSelector(".first-run-hint-card", { timeout: 60_000 });
  await page.locator(".first-run-hint-card").screenshot({
    path: path.join(outDir, `first-run-checklist-0-${scheme}.png`),
  });
}

async function captureChecklistOneOpenFile(
  page: Page,
  port: number,
  scheme: "light" | "dark",
): Promise<void> {
  const contents = fs.readFileSync(scheduleFixture, "utf8");
  const pick = {
    path: scheduleFixture,
    contents,
  };
  await page.evaluate((payload) => {
    sessionStorage.setItem("manual-screenshot-open-pick", payload);
  }, JSON.stringify(pick));
  await page
    .locator(".first-run-hint-card__checklist-btn")
    .first()
    .click();
  await page.waitForFunction(
    () => {
      const file = document.querySelector(".status-bar-file");
      return file?.textContent?.includes("playground.schedule.json") ?? false;
    },
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForSelector(
    ".first-run-hint-card__checklist-item--done",
    { timeout: 30_000 },
  );
  await page.waitForTimeout(300);
  await page.locator(".first-run-hint-card").screenshot({
    path: path.join(outDir, `first-run-checklist-1-openfile-${scheme}.png`),
  });
}

async function captureSet(port: number): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const scheme of ["light", "dark"] as const) {
    await bootPage(page, port, scheme);
    await captureChecklistZero(page, scheme);
    await captureChecklistOneOpenFile(page, port, scheme);
  }

  await browser.close();
}

async function main(): Promise<void> {
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
