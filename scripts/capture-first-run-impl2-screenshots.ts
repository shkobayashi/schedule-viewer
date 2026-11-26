/**
 * NAV-09 prepare-schedule card + NAV-08 guide top → /cursor/stores/self/first-run-impl2/
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
const outDir = path.join("/cursor/stores/self", "first-run-impl2");
const COLOR_SCHEME_LS_KEY = `${SCHEDULE_VIEWER_LS_PREFIX}color-scheme`;

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

async function clearAppLocalStorage(page: Page): Promise<void> {
  await page.evaluate((body) => {
    const fn = eval(body) as (storage: Storage) => void;
    fn(localStorage);
  }, clearScheduleViewerLocalStorageEvaluateSource());
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

async function captureCardZero(page: Page, scheme: "light" | "dark"): Promise<void> {
  await page.waitForSelector(".first-run-hint-card", { timeout: 60_000 });
  await page.locator(".first-run-hint-card").screenshot({
    path: path.join(outDir, `first-run-checklist-0-${scheme}.png`),
  });
}

async function captureCardAfterSkill(page: Page, scheme: "light" | "dark"): Promise<void> {
  await page.getByRole("button", { name: "LLM で作る", exact: true }).click();
  await page.waitForSelector(".settings-dialog", { timeout: 30_000 });
  const installBtn = page
    .locator(".settings-dialog")
    .getByRole("button", { name: "置く", exact: true });
  await page.waitForFunction(
    (btn) => btn instanceof HTMLButtonElement && !btn.disabled,
    await installBtn.elementHandle(),
    { timeout: 30_000 },
  );
  await installBtn.click();
  await page.waitForSelector("text=JSON作成スキルを置きました", {
    timeout: 30_000,
  });
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("schedule-viewer/first-run/checklist");
    if (!raw) return false;
    try {
      return JSON.parse(raw).prepareSchedule === true;
    } catch {
      return false;
    }
  });
  await page
    .locator(".settings-dialog")
    .getByRole("button", { name: "閉じる" })
    .click();
  await page.waitForSelector(".settings-dialog", { state: "hidden", timeout: 30_000 });
  await page.waitForTimeout(200);
  await page.waitForSelector(
    ".first-run-hint-card__checklist-item--prepare.first-run-hint-card__checklist-item--done",
    { timeout: 30_000 },
  );
  await page.locator(".first-run-hint-card").screenshot({
    path: path.join(outDir, `first-run-checklist-1-skill-${scheme}.png`),
  });
}

async function captureGuideTop(page: Page, scheme: "light" | "dark"): Promise<void> {
  await page
    .locator(".toolbar")
    .getByRole("button", { name: "案内", exact: true })
    .click();
  await page.waitForSelector(".guide-modal", { timeout: 30_000 });
  await page.locator(".guide-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(150);
  await page.locator(".guide-modal").screenshot({
    path: path.join(outDir, `guide-top-${scheme}.png`),
  });
  await page.keyboard.press("Escape");
}

async function main(): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const port = 5176;
  killPort(port);
  const vite = spawn(
    "npm",
    ["run", "dev:manual-screenshot", "--", "--host", "127.0.0.1", "--port", String(port)],
    { cwd: repoRoot, stdio: "ignore" },
  );
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    for (const scheme of ["light", "dark"] as const) {
      await bootPage(page, port, scheme);
      await captureCardZero(page, scheme);
      await captureCardAfterSkill(page, scheme);
      await captureGuideTop(page, scheme);
    }
    console.log(`Wrote screenshots to ${outDir}`);
  } finally {
    await browser.close();
    vite.kill();
    killPort(port);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
