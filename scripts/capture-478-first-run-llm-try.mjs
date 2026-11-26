/**
 * Issue #478: first-run card with MCP done +「LLM に頼んでみる」block (light/dark 2×).
 */
import { execSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = "/opt/cursor/artifacts";
const port = 5192;
const COLOR_SCHEME_LS_KEY = "schedule-viewer/color-scheme";
const LS_FIRST_RUN_DISMISSED = "schedule-viewer/first-run/hint-dismissed";
const LS_CHECKLIST = "schedule-viewer/first-run/checklist";
const HEAD = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();

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

async function applyColorScheme(page, scheme) {
  await page.emulateMedia({
    colorScheme: scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate(
    ({ colorKey, colorValue, checklistKey, checklistValue, dismissedKey }) => {
      localStorage.setItem(colorKey, colorValue);
      localStorage.setItem(checklistKey, checklistValue);
      localStorage.removeItem(dismissedKey);
    },
    {
      colorKey: COLOR_SCHEME_LS_KEY,
      colorValue: scheme,
      checklistKey: LS_CHECKLIST,
      checklistValue: JSON.stringify({
        prepareSchedule: true,
        guide: true,
        mcp: true,
      }),
      dismissedKey: LS_FIRST_RUN_DISMISSED,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".first-run-hint-card__llm-try", { timeout: 60_000 });
}

async function captureCard(page, scheme) {
  const card = page.locator(".first-run-hint-card");
  await card.waitFor({ state: "visible" });
  const text = await card.textContent();
  if (!text?.includes("LLM に頼んでみる")) {
    throw new Error("missing LLM try block");
  }
  if (!text?.includes("選んでいるタスクを 2 日後ろにずらして")) {
    throw new Error("missing shift prompt");
  }
  const path1 = path.join(outDir, `first-run-llm-try-${scheme}.png`);
  const path2x = path.join(outDir, `first-run-llm-try-${scheme}-2x.png`);
  const shot = await card.screenshot({ type: "png" });
  await sharp(shot).png().toFile(path1);
  const meta = await sharp(shot).metadata();
  await sharp(shot)
    .resize((meta.width ?? 1) * 2, (meta.height ?? 1) * 2, {
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toFile(path2x);
  return [path1, path2x];
}

async function main() {
  killPort(port);
  const vite = spawn("npm", ["run", "dev", "--", "--port", String(port), "--strictPort"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
  });
  try {
    await waitForServer(`http://127.0.0.1:${port}/`);
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const written = [];
    for (const scheme of ["light", "dark"]) {
      await applyColorScheme(page, scheme);
      written.push(...(await captureCard(page, scheme)));
    }
    await browser.close();
    console.log("HEAD", HEAD);
    for (const f of written) console.log(f);
  } finally {
    killPort(port);
    try {
      process.kill(-vite.pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
