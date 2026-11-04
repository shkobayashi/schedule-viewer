/**
 * NAV-08 rewritten guide → /cursor/stores/self/guide-impl/
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
const outDir = path.join("/cursor/stores/self", "guide-impl");
const COLOR_SCHEME_LS_KEY = `${SCHEDULE_VIEWER_LS_PREFIX}color-scheme`;
const MORE_HEADING = "もう少し知りたいとき";

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
  await page.waitForTimeout(300);
}

async function openGuide(page: Page): Promise<void> {
  await page
    .locator(".toolbar")
    .getByRole("button", { name: "案内", exact: true })
    .click();
  await page.waitForSelector(".guide-modal", { timeout: 30_000 });
  await page.waitForSelector(".guide-body", { timeout: 30_000 });
  await page.waitForTimeout(200);
}

async function captureGuide(
  page: Page,
  scheme: "light" | "dark",
  variant: "top" | "more",
): Promise<void> {
  const body = page.locator(".guide-body");
  if (variant === "more") {
    await body.evaluate((el, heading) => {
      const target = Array.from(el.querySelectorAll("h3")).find(
        (node) => node.textContent === heading,
      );
      if (target instanceof HTMLElement) {
        el.scrollTop = target.offsetTop;
      }
    }, MORE_HEADING);
    await page.waitForTimeout(300);
  } else {
    await body.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(100);
  }
  await page.locator(".guide-modal").screenshot({
    path: path.join(outDir, `guide-${variant}-${scheme}.png`),
  });
}

async function main(): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  const port = 5175;
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
      await openGuide(page);
      await captureGuide(page, scheme, "top");
      await captureGuide(page, scheme, "more");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
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
